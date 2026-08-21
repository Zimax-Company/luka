import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { lagosMinutesOfDay, lagosToday } from '@/lib/schedule';
import { sendPushToUsers } from '@/lib/push';

const prisma = createPrismaClient();

// Reminder window in Lagos time: 10:00 (600) — 20:00 (1200).
const WINDOW_START = 10 * 60;
const WINDOW_END = 20 * 60;

const REMINDER = {
  title: 'Luka',
  body: 'Have you made or spent money today, record it!',
  data: { type: 'reminder' as const },
};

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // local/dev: no secret configured
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

// Stable per-day hash so every cron run within the same Lagos day computes the
// SAME target minute (using Math.random would move the target between runs).
function hashDate(iso: string): number {
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Push to every active user that has a registered device (sendPushToUsers prunes
// dead tokens and no-ops for users without one).
async function sendToEveryone(): Promise<number> {
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  const ids = users.map(u => u.id);
  await sendPushToUsers(ids, REMINDER);
  return ids.length;
}

// GET /api/cron/daily-reminder
// Fires the "record your money" reminder once per day at a random time in the
// 10am–8pm Lagos window. Run this every ~30 min across the window (see vercel.json);
// each run sends only once the day's random target time has passed, guarded to
// exactly one send per day by the reminder_log row. Pass ?force=1 (dev/authorized)
// to send a test push immediately, ignoring the window and the once-a-day guard.
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const force = new URL(request.url).searchParams.get('force') === '1';
    if (force) {
      const recipients = await sendToEveryone();
      return NextResponse.json({ success: true, forced: true, recipients });
    }

    const today = lagosToday();
    const iso = today.toISOString().slice(0, 10);
    const mins = lagosMinutesOfDay();

    if (mins < WINDOW_START) {
      return NextResponse.json({ success: true, skipped: 'before-window' });
    }

    // Already sent today?
    if (await prisma.reminderLog.findUnique({ where: { date: today } })) {
      return NextResponse.json({ success: true, skipped: 'already-sent' });
    }

    // Random target minute in [WINDOW_START, WINDOW_END], stable for the whole day.
    const target = WINDOW_START + (hashDate(iso) % (WINDOW_END - WINDOW_START + 1));
    // Send once we've reached the target, or force a catch-up at/after the window
    // close so a day is never skipped (e.g. an earlier run was missed).
    if (mins < target && mins < WINDOW_END) {
      return NextResponse.json({ success: true, skipped: 'waiting', target, mins });
    }

    // Reserve the day first — the unique PK makes concurrent runs safe (only the
    // first insert wins; the rest hit the catch below and skip sending).
    try {
      await prisma.reminderLog.create({ data: { date: today } });
    } catch {
      return NextResponse.json({ success: true, skipped: 'already-sent' });
    }

    const recipients = await sendToEveryone();
    return NextResponse.json({ success: true, sent: true, recipients, target, mins });
  } catch (error) {
    console.error('daily-reminder failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to run daily reminder' }, { status: 500 });
  }
}

export const POST = GET;
