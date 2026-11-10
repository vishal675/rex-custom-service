/**
 * Turns Supabase / server errors into short, human messages.
 * Server RPCs raise stable codes (e.g. `under_18`) as the error message — see the core schema migration.
 */
const SERVER_CODES: Record<string, string> = {
  not_authenticated: 'Your session has ended. Please sign in again.',
  onboarding_required: 'Finish setting up your profile first.',
  under_18: 'You need to be 18 or older to use VYBE.',
  invalid_date_of_birth: 'Please enter a valid date of birth.',
  invalid_timezone: "We couldn't detect your timezone. Please try again.",
  not_found: "We couldn't find anyone with that username.",
  invalid_target: "You can't do that with your own account.",
  request_not_found: 'That request is no longer available.',
  rate_limited: "You're doing that a lot. Please try again later.",
  premium_required: 'That needs VYBE Premium.',
  empty_audience: 'Pick at least one friend or group.',
  audience_too_large: 'That audience is too large.',
  invalid_circle: 'That group no longer exists.',
  invalid_duration: 'Please pick how long you’re free.',
  not_available: 'That plan has already ended.',
  circle_full: 'Groups can have up to 200 people.',
};

const AUTH_CODES: Record<string, string> = {
  otp_expired: 'That code is wrong or has expired. Request a new one.',
  over_email_send_rate_limit: 'Too many codes requested. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  email_address_invalid: 'Please enter a valid email address.',
  email_address_not_authorized: "We can't send email to that address yet.",
  signup_disabled: 'New sign-ups are paused right now.',
};

type ErrorLike = { code?: unknown; message?: unknown; name?: unknown };

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const { code, message } = error as ErrorLike;
    const msg = typeof message === 'string' ? message : '';
    if (typeof code === 'string' && AUTH_CODES[code]) return AUTH_CODES[code];
    if (SERVER_CODES[msg]) return SERVER_CODES[msg];
    if (code === '23505') return 'That username is taken.';
    if (code === '23514' && msg.includes('username_format')) {
      return 'Usernames are 3–20 characters: lowercase letters, numbers, dots and underscores.';
    }
    if (/network request failed|failed to fetch/i.test(msg)) {
      return "You're offline. Check your connection and try again.";
    }
  }
  return 'Something went wrong. Please try again.';
}

export function isPremiumRequired(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as ErrorLike).message === 'premium_required';
}
