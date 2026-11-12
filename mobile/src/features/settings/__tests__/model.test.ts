import { describe, expect, it } from '@jest/globals';
import { hourLabel, parseHour, parseQuietHours, quietHoursSummary, quietHoursUpdate, toTime } from '../model';

describe('quiet hours', () => {
  it('parses Postgres times', () => {
    expect(parseHour('22:00:00')).toBe(22);
    expect(parseHour('00:00')).toBe(0);
    expect(parseHour(null)).toBeNull();
    expect(parseHour('nope')).toBeNull();
    expect(parseHour('25:00')).toBeNull();
  });

  it('needs both ends to be on', () => {
    expect(parseQuietHours('22:00:00', '07:00:00')).toEqual({ start: 22, end: 7 });
    expect(parseQuietHours('22:00:00', null)).toBeNull();
  });

  it('labels hours in 12h time', () => {
    expect(hourLabel(0)).toBe('12 AM');
    expect(hourLabel(9)).toBe('9 AM');
    expect(hourLabel(12)).toBe('12 PM');
    expect(hourLabel(22)).toBe('10 PM');
    expect(quietHoursSummary({ start: 22, end: 7 })).toBe('Silent 10 PM – 7 AM');
    expect(quietHoursSummary(null)).toBe('Off');
  });

  it('builds DB updates (off clears both; missing end defaults to 7 AM)', () => {
    expect(quietHoursUpdate(null, 8)).toEqual({ quiet_hours_start: null, quiet_hours_end: null });
    expect(quietHoursUpdate(23, null)).toEqual({ quiet_hours_start: '23:00', quiet_hours_end: '07:00' });
    expect(quietHoursUpdate(0, 9)).toEqual({ quiet_hours_start: '00:00', quiet_hours_end: '09:00' });
    expect(toTime(5)).toBe('05:00');
  });
});
