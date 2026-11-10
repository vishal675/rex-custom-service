import { describe, expect, it } from '@jest/globals';

import {
  ageOn,
  dobError,
  formatDobInput,
  isValidEmail,
  isValidOtp,
  parseDob,
  toIsoDate,
  usernameError,
} from '../model';

describe('email & code', () => {
  it('validates emails', () => {
    expect(isValidEmail(' Vishal@Example.com ')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b.c')).toBe(false);
  });
  it('accepts only 6-digit codes', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('12345a')).toBe(false);
  });
});

describe('usernameError (mirrors the DB constraint)', () => {
  it.each(['vishal', 'v.p_23', '@Rahul', 'abc'])('accepts %s', (u) => expect(usernameError(u)).toBeNull());
  it.each([
    ['ab', /At least 3/],
    ['a'.repeat(21), /At most 20/],
    ['hi there', /Only letters/],
    ['.vishal', /start and end/],
    ['vishal_', /start and end/],
    ['vi..shal', /two dots/],
    ['vi._shal', /two dots/],
  ])('rejects %s', (u, msg) => expect(usernameError(u)).toMatch(msg));
});

describe('date of birth', () => {
  const today = { year: 2026, month: 11, day: 10 };

  it('formats as the user types', () => {
    expect(formatDobInput('15')).toBe('15');
    expect(formatDobInput('1503')).toBe('15/03');
    expect(formatDobInput('15031998')).toBe('15/03/1998');
    expect(formatDobInput('15/03/19989')).toBe('15/03/1998');
  });

  it('rejects impossible dates', () => {
    expect(parseDob('31/02/2000')).toBeNull();
    expect(parseDob('2000-01-01')).toBeNull();
    expect(parseDob('29/02/2004')).toEqual({ year: 2004, month: 2, day: 29 });
  });

  it('computes age around the birthday', () => {
    expect(ageOn({ year: 2008, month: 11, day: 10 }, today)).toBe(18);
    expect(ageOn({ year: 2008, month: 11, day: 11 }, today)).toBe(17);
  });

  it('enforces 18+', () => {
    expect(dobError('10/11/2008', today)).toBeNull();
    expect(dobError('11/11/2008', today)).toMatch(/18 or older/);
    expect(dobError('01/01/2030', today)).toMatch(/valid date/);
  });

  it('serialises to ISO', () => {
    expect(toIsoDate({ year: 1998, month: 3, day: 5 })).toBe('1998-03-05');
  });
});
