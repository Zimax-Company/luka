import { GoogleAuth } from 'google-auth-library';
import { createPrismaClient } from './prismaClient';

const prisma = createPrismaClient();

// Firebase service-account creds (set on Vercel). Push is a no-op until all are
// present, so the app works fine before FCM is configured.
function fcmCreds(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  // Env stores the PEM with literal "\n"; restore real newlines.
  privateKey = privateKey.replace(/\\n/g, '\n');
  return { projectId, clientEmail, privateKey };
}

let auth: GoogleAuth | null = null;
async function accessToken(creds: { clientEmail: string; privateKey: string }): Promise<string | null> {
  auth ??= new GoogleAuth({
    credentials: { client_email: creds.clientEmail, private_key: creds.privateKey },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const t = await auth.getAccessToken();
  return t ?? null;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Send an FCM push to every registered device of the given users. Invalid /
// unregistered tokens are pruned. Fire-and-forget — never throws to the caller.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  try {
    const creds = fcmCreds();
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (!creds || ids.length === 0) return;

    const rows = await prisma.deviceToken.findMany({
      where: { userId: { in: ids } },
      select: { token: true },
    });
    if (rows.length === 0) return;

    const token = await accessToken(creds);
    if (!token) return;

    const url = `https://fcm.googleapis.com/v1/projects/${creds.projectId}/messages:send`;
    await Promise.all(
      rows.map(async ({ token: deviceToken }) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: {
                token: deviceToken,
                notification: { title: payload.title, body: payload.body },
                data: payload.data ?? {},
                android: { priority: 'HIGH', notification: { channelId: 'luka-default' } },
              },
            }),
          });
          // 404 UNREGISTERED / 400 invalid → the token is dead; remove it.
          if (res.status === 404 || res.status === 400) {
            await prisma.deviceToken.deleteMany({ where: { token: deviceToken } }).catch(() => {});
          }
        } catch {
          /* per-token failure ignored */
        }
      }),
    );
  } catch (error) {
    console.error('sendPushToUsers failed:', error);
  }
}
