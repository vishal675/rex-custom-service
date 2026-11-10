/** Pure sign-in / onboarding rules. Mirrors the server checks so users get instant feedback; the server still enforces them. */

export const MIN_AGE = 18;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

export function isValidOtp(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/^@/, '');
}

/** Same rule as the `username_format` check constraint. Returns an error message or null. */
export function usernameError(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (u.length < 3) return 'At least 3 characters.';
  if (u.length > 20) return 'At most 20 characters.';
  if (!/^[a-z0-9._]+$/.test(u)) return 'Only letters, numbers, dots and underscores.';
  if (!/^[a-z0-9].*[a-z0-9]$/.test(u)) return 'Must start and end with a letter or number.';
  if (/[._]{2}/.test(u)) return 'No two dots or underscores in a row.';
  return null;
}

export function displayNameError(raw: string): string | null {
  const n = raw.trim();
  if (n.length === 0) return 'Please enter your name.';
  if (n.length > 50) return 'At most 50 characters.';
  return null;
}

/** Formats digits as the user types: "1503" → "15/03", "15031998" → "15/03/1998". */
export function formatDobInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export type CalendarDate = { year: number; month: number; day: number };

/** Parses "DD/MM/YYYY". Returns null for impossible dates such as 31/02/2000. */
export function parseDob(input: string): CalendarDate | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  if (year < 1900) return null;
  return { year, month, day };
}

export function ageOn(dob: CalendarDate, today: CalendarDate): number {
  let age = today.year - dob.year;
  if (today.month < dob.month || (today.month === dob.month && today.day < dob.day)) age--;
  return age;
}

export function todayLocal(now: Date = new Date()): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Returns an error message or null. */
export function dobError(input: string, today: CalendarDate = todayLocal()): string | null {
  const dob = parseDob(input);
  if (!dob) return 'Enter a valid date as DD/MM/YYYY.';
  const age = ageOn(dob, today);
  if (age < 0) return 'Enter a valid date as DD/MM/YYYY.';
  if (age < MIN_AGE) return `You need to be ${MIN_AGE} or older to use VYBE.`;
  return null;
}

export function toIsoDate({ year, month, day }: CalendarDate): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
