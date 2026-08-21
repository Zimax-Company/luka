// Date math for recurring schedules. All dates are handled as calendar days in
// Africa/Lagos (UTC+1, no DST), represented as a Date at UTC-midnight of that
// Lagos day so Prisma @db.Date round-trips cleanly.

export type Cadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // UTC+1

// Today's calendar day in Lagos, as a UTC-midnight Date.
export function lagosToday(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + LAGOS_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

// Minutes elapsed since midnight in Lagos (0–1439). e.g. 10:00 → 600, 20:00 → 1200.
export function lagosMinutesOfDay(now: Date = new Date()): number {
  const shifted = new Date(now.getTime() + LAGOS_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

// The next occurrence on or after `from` for the given cadence.
export function firstRunOnOrAfter(
  from: Date,
  cadence: Cadence,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
): Date {
  const base = toDateOnly(from);
  switch (cadence) {
    case 'DAILY':
      return base;
    case 'WEEKLY': {
      const target = ((dayOfWeek ?? base.getUTCDay()) % 7 + 7) % 7;
      const diff = (target - base.getUTCDay() + 7) % 7;
      return addDays(base, diff);
    }
    case 'MONTHLY': {
      const dom = dayOfMonth ?? base.getUTCDate();
      let y = base.getUTCFullYear();
      let m = base.getUTCMonth();
      const clampedThis = Math.min(dom, daysInMonth(y, m));
      if (clampedThis >= base.getUTCDate()) {
        return new Date(Date.UTC(y, m, clampedThis));
      }
      m += 1;
      if (m > 11) { m = 0; y += 1; }
      return new Date(Date.UTC(y, m, Math.min(dom, daysInMonth(y, m))));
    }
    case 'YEARLY':
      return base;
    default:
      return base;
  }
}

// Advance one full cycle from a given run date.
export function nextRun(
  current: Date,
  cadence: Cadence,
  dayOfMonth?: number | null,
): Date {
  const d = toDateOnly(current);
  switch (cadence) {
    case 'DAILY':
      return addDays(d, 1);
    case 'WEEKLY':
      return addDays(d, 7);
    case 'MONTHLY': {
      let y = d.getUTCFullYear();
      let m = d.getUTCMonth() + 1;
      if (m > 11) { m = 0; y += 1; }
      const dom = dayOfMonth ?? d.getUTCDate();
      return new Date(Date.UTC(y, m, Math.min(dom, daysInMonth(y, m))));
    }
    case 'YEARLY':
      return new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()));
    default:
      return addDays(d, 1);
  }
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
