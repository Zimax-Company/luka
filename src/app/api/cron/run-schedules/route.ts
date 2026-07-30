import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getAccountNotificationRecipients } from '@/lib/access';
import { draftExists, draftFingerprint } from '@/lib/drafts';
import { Cadence, lagosToday, nextRun } from '@/lib/schedule';
import { PrismaEntryService } from '@/services/prismaEntryService';
import { invalidateCategoryModel } from '@/lib/categorizeStore';
import { sendPushToUsers } from '@/lib/push';

const prisma = createPrismaClient();

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // local/dev: no secret configured
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

// Generate today's scheduled entries: draft them into the inbox (or post
// directly when autoPost). Idempotent — advancing nextRunOn + the draft
// fingerprint stop double-drafting on retries/overlaps.
async function run() {
  const today = lagosToday();
  const templates = await prisma.recurringTemplate.findMany({
    where: { active: true, nextRunOn: { lte: today } },
    take: 1000,
  });

  let drafted = 0;
  let posted = 0;
  const draftsByAccount = new Map<string, number>();

  for (const t of templates) {
    const runDate = t.nextRunOn;
    const dateStr = runDate.toISOString().slice(0, 10);
    const amount = t.amount == null ? null : Number(t.amount);

    // Advance the schedule first (so a crash mid-loop can't replay this one).
    await prisma.recurringTemplate.update({
      where: { id: t.id },
      data: { nextRunOn: nextRun(runDate, t.cadence as Cadence, t.dayOfMonth), lastRunOn: runDate },
    });

    if (t.autoPost && amount != null && amount > 0) {
      try {
        await PrismaEntryService.create({
          accountId: t.accountId,
          categoryId: t.categoryId,
          amount,
          date: dateStr,
          note: t.note ?? '',
        });
        invalidateCategoryModel(t.accountId);
        posted += 1;
      } catch (e) {
        console.error('autoPost failed for template', t.id, e);
      }
      continue;
    }

    // Draft into the inbox (dedup by fingerprint).
    const fp = draftFingerprint({ accountId: t.accountId, date: dateStr, amount: amount ?? 0, note: t.note });
    if (await draftExists(t.accountId, fp)) continue;

    await prisma.draftEntry.create({
      data: {
        customerId: t.customerId,
        accountId: t.accountId,
        categoryId: t.categoryId,
        type: t.type,
        amount,
        note: t.note,
        date: runDate,
        source: 'RECURRING',
        status: 'PENDING',
        fingerprint: fp,
        templateId: t.id,
      },
    });
    drafted += 1;
    draftsByAccount.set(t.accountId, (draftsByAccount.get(t.accountId) ?? 0) + 1);
  }

  // Notify each account's members/admins that drafts are waiting.
  for (const [accountId, n] of draftsByAccount) {
    try {
      const recipients = await getAccountNotificationRecipients(null, accountId);
      if (recipients.length === 0) continue;
      const account = await prisma.account.findUnique({ where: { id: accountId }, select: { name: true, customerId: true } });
      const summary = `${n} scheduled ${n === 1 ? 'entry' : 'entries'} ready to review in ${account?.name ?? 'an account'}`;
      await prisma.notification.createMany({
        data: recipients.map(r => ({
          customerId: account?.customerId ?? null,
          recipientId: r.id,
          actorId: null,
          actorName: 'Luka',
          action: 'CREATE',
          resource: 'draft',
          resourceId: null,
          accountId,
          accountName: account?.name ?? null,
          summary,
        })),
      });
      void sendPushToUsers(recipients.map(r => r.id), {
        title: 'Inbox',
        body: summary,
        data: { type: 'draft', accountId },
      });
    } catch (e) {
      console.error('draft notification failed', e);
    }
  }

  return { drafted, posted, templates: templates.length };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await run();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('run-schedules failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to run schedules' }, { status: 500 });
  }
}

export const POST = GET;
