/**
 * Quiet hours: whole hours, stored as Postgres `time` ('22:00:00'). The push function skips
 * notifications inside the window, in the user's own timezone; windows may cross midnight.
 */
export const QUIET_START_HOURS = [21, 22, 23, 0] as const;
export const QUIET_END_HOURS = [6, 7, 8, 9] as const;
export const DEFAULT_QUIET_END = 7;

export type QuietHours = { start: number; end: number } | null;

/** '22:00:00' → 22; anything unparsable → null. */
export function parseHour(time: string | null | undefined): number | null {
  if (!time) return null;
  const h = Number(time.split(':')[0]);
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : null;
}

export function toTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function parseQuietHours(start: string | null, end: string | null): QuietHours {
  const s = parseHour(start);
  const e = parseHour(end);
  return s === null || e === null ? null : { start: s, end: e };
}

/** 0 → '12 AM', 22 → '10 PM'. */
export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

export function quietHoursSummary(q: QuietHours): string {
  return q ? `Silent ${hourLabel(q.start)} – ${hourLabel(q.end)}` : 'Off';
}

/** DB columns for a quiet-hours choice (null start = off). */
export function quietHoursUpdate(start: number | null, end: number | null) {
  if (start === null) return { quiet_hours_start: null, quiet_hours_end: null };
  return { quiet_hours_start: toTime(start), quiet_hours_end: toTime(end ?? DEFAULT_QUIET_END) };
}
