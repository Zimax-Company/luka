import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Platform back-office auth. Separate from the customer-facing app auth: it
// grants platform owners cross-tenant visibility (manage all customers).
//
// Admin accounts live in the `backoffice_users` table and are managed from the
// back office UI. There is a FIRST-RUN BOOTSTRAP: while the table has no active
// admins, a default hardcoded login is accepted so you can sign in and create
// real accounts. As soon as one active admin exists, the default stops working.
// The default password can be overridden with BACKOFFICE_PASSWORD if you want a
// non-public bootstrap secret; BACKOFFICE_SECRET overrides the cookie HMAC key.
// The session is a signed, expiring HttpOnly cookie carrying the subject (the
// back-office user id, or "bootstrap") — no server-side session store.

export const BO_COOKIE = 'bo_session';
export const BO_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const BOOTSTRAP_SUB = 'bootstrap';

// Default first-run bootstrap credentials (only valid while there are no admins).
export const DEFAULT_BOOTSTRAP_EMAIL = 'admin@luka.app';
const DEFAULT_BOOTSTRAP_PASSWORD = 'luka-admin';

function secret(): string {
  return process.env.BACKOFFICE_SECRET || process.env.BACKOFFICE_PASSWORD || 'luka-backoffice';
}

// --- Bootstrap (only usable while there are no active back-office users) ---
export function bootstrapEmail(): string {
  return process.env.BACKOFFICE_EMAIL || DEFAULT_BOOTSTRAP_EMAIL;
}
function bootstrapPassword(): string {
  return process.env.BACKOFFICE_PASSWORD || DEFAULT_BOOTSTRAP_PASSWORD;
}
// Accept the bootstrap login by password (the email is only used for display).
export function checkBootstrap(password: string | undefined): boolean {
  if (!password) return false;
  return timingSafeEqualStr(password, bootstrapPassword());
}
// The hardcoded default credentials, surfaced on the login page during first-run
// so the operator knows how to get in. Null when a custom BACKOFFICE_PASSWORD is
// set (don't leak a secret the operator chose).
export function defaultBootstrapCredentials(): { email: string; password: string } | null {
  if (process.env.BACKOFFICE_PASSWORD) return null;
  return { email: bootstrapEmail(), password: DEFAULT_BOOTSTRAP_PASSWORD };
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
