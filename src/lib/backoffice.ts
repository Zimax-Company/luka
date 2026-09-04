import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Platform back-office auth. Separate from the customer-facing app auth: it
// grants platform owners cross-tenant visibility (manage all customers).
//
// Admin accounts live in the `backoffice_users` table and are managed from the
// back office UI. The env credentials below are a FIRST-RUN BOOTSTRAP ONLY —
// they let you sign in while `backoffice_users` is empty so you can create real
// accounts; once any active back-office user exists, the env login is ignored.
//   BACKOFFICE_PASSWORD  (bootstrap password)
//   BACKOFFICE_EMAIL     (bootstrap email; defaults to "owner")
//   BACKOFFICE_SECRET    (HMAC key for the session cookie; falls back to
//                         BACKOFFICE_PASSWORD)
// The session is a signed, expiring HttpOnly cookie carrying the subject (the
// back-office user id, or "bootstrap") — no server-side session store.

export const BO_COOKIE = 'bo_session';
export const BO_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const BOOTSTRAP_SUB = 'bootstrap';

function secret(): string {
  return process.env.BACKOFFICE_SECRET || process.env.BACKOFFICE_PASSWORD || 'luka-backoffice';
}

// --- Env bootstrap (only usable while there are no back-office users) ---
export function envBootstrapConfigured(): boolean {
  return !!process.env.BACKOFFICE_PASSWORD;
}
export function envBootstrapEmail(): string {
  return process.env.BACKOFFICE_EMAIL || 'owner';
}
export function checkEnvBootstrap(email: string | undefined, password: string | undefined): boolean {
  const pw = process.env.BACKOFFICE_PASSWORD;
  if (!pw || !password) return false;
  const expectedEmail = process.env.BACKOFFICE_EMAIL;
  if (expectedEmail && (email ?? '').toLowerCase() !== expectedEmail.toLowerCase()) return false;
  return timingSafeEqualStr(password, pw);
}

// --- Password hashing (salted scrypt: "saltHex:hashHex") ---
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = (stored || '').split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// --- Session token: "<sub>.<exp>.<sig>", sig = HMAC(sub.exp) ---
function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(sub: string, now: number = Date.now()): string {
  const exp = now + BO_TTL_MS;
  const payload = `${sub}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

// Returns the token subject (back-office user id or "bootstrap") if valid, else null.
export function readSessionSubject(token: string | undefined | null): string | null {
  if (!token || !secret()) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [sub, expStr, sig] = parts;
  if (!timingSafeEqualStr(sig, sign(`${sub}.${expStr}`))) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return null;
  return sub;
}

// The back-office subject for this request (or null if unauthenticated).
export function getBackofficeSub(request: NextRequest): string | null {
  return readSessionSubject(request.cookies.get(BO_COOKIE)?.value);
}

// True when the request carries a valid back-office session cookie.
export function isBackofficeRequest(request: NextRequest): boolean {
  return getBackofficeSub(request) !== null;
}
