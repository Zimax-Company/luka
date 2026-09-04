import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Platform back-office auth. This is separate from the customer-facing app auth:
// it grants a single platform owner cross-tenant visibility (manage all
// customers). Credentials come from env so no schema/user row is needed:
//   BACKOFFICE_PASSWORD  (required — the back office is disabled until it is set)
//   BACKOFFICE_EMAIL     (optional — if set, the login email must match)
//   BACKOFFICE_SECRET    (optional — HMAC key for the session cookie; falls back
//                         to BACKOFFICE_PASSWORD)
// The session is a signed, expiring cookie (HttpOnly) — no server-side store.

export const BO_COOKIE = 'bo_session';
export const BO_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  return process.env.BACKOFFICE_SECRET || process.env.BACKOFFICE_PASSWORD || '';
}

export function backofficeEnabled(): boolean {
  return !!process.env.BACKOFFICE_PASSWORD;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function checkBackofficeCredentials(email: string | undefined, password: string | undefined): boolean {
  const pw = process.env.BACKOFFICE_PASSWORD;
  if (!pw || !password) return false;
  const expectedEmail = process.env.BACKOFFICE_EMAIL;
  if (expectedEmail && (email ?? '').toLowerCase() !== expectedEmail.toLowerCase()) return false;
  return timingSafeEqualStr(password, pw);
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(now: number = Date.now()): string {
  const payload = String(now + BO_TTL_MS); // expiry timestamp
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !secret()) return false;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!timingSafeEqualStr(sig, sign(payload))) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

// True when the request carries a valid back-office session cookie.
export function isBackofficeRequest(request: NextRequest): boolean {
  return verifySessionToken(request.cookies.get(BO_COOKIE)?.value);
}
