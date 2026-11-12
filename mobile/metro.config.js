// Sentry's Expo metro config = Expo's default config + debug IDs for source maps.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
