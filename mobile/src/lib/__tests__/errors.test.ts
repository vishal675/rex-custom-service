import { describe, expect, it } from '@jest/globals';

import { errorMessage, isPremiumRequired } from '../errors';

describe('errorMessage', () => {
  it('maps server RPC codes', () => {
    expect(errorMessage({ message: 'under_18' })).toMatch(/18 or older/);
    expect(errorMessage({ message: 'premium_required' })).toMatch(/Premium/);
  });
  it('maps unique and check violations', () => {
    expect(errorMessage({ code: '23505', message: 'duplicate key' })).toBe('That username is taken.');
    expect(errorMessage({ code: '23514', message: 'violates check constraint "username_format"' })).toMatch(/3–20/);
  });
  it('maps auth error codes', () => {
    expect(errorMessage({ code: 'otp_expired', message: 'Token has expired or is invalid' })).toMatch(/expired/);
  });
  it('never leaks raw messages', () => {
    expect(errorMessage({ message: 'relation "x" does not exist' })).toBe('Something went wrong. Please try again.');
    expect(errorMessage(null)).toBe('Something went wrong. Please try again.');
  });
  it('detects premium_required', () => {
    expect(isPremiumRequired({ message: 'premium_required' })).toBe(true);
    expect(isPremiumRequired({ message: 'other' })).toBe(false);
  });
});
