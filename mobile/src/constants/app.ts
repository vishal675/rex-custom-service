/** Product name (pending trademark check — see docs/VYBE_AUDIT_AND_ROADMAP.md, D7). */
export const APP_NAME = 'VYBE';
export const TAGLINE = 'Less planning. More living.';

/** Legal pages (required on the paywall by Apple/Google). Set in EAS env once the pages are live. */
export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? '';
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? '';
