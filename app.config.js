/**
 * Config Expo: merge app.json con extra da .env.
 * I Client ID Google/Microsoft in extra sono letti da createExpoConfig (che carica .env)
 * e restano disponibili a runtime in Constants.expoConfig.extra (APK/standalone).
 */
const base = require('./app.json');

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    plugins: [...(base.expo.plugins || []), 'expo-localization'],
    extra: {
      ...base.expo.extra,
      // Embed at build time (createExpoConfig loads .env) — AuthScreen legge da Constants.expoConfig.extra
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
      EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || '',
      EXPO_PUBLIC_MICROSOFT_CLIENT_ID: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '',
    },
  },
};
