import type { ConfigContext, ExpoConfig } from 'expo/config';

// Every TestFlight upload needs a new build number: `npm run bump:build` edits this line.
const BUILD_NUMBER = '1';
const VERSION = '0.1.0';

const CALENDAR_USAGE = 'Ders programını takviminden okumak için. Takvimine bir şey yazmayız.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tavında',
  slug: 'tavinda',
  scheme: 'tavinda',
  version: VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  locales: { tr: './locales/tr.json' },
  ios: {
    bundleIdentifier: process.env.IOS_BUNDLE_ID ?? 'com.REPLACE.tavinda',
    buildNumber: BUILD_NUMBER,
    appleTeamId: process.env.APPLE_TEAM_ID,
    supportsTablet: false,
    infoPlist: {
      CFBundleDevelopmentRegion: 'tr',
      CFBundleLocalizations: ['tr'],
      NSCalendarsUsageDescription: CALENDAR_USAGE,
      NSCalendarsFullAccessUsageDescription: CALENDAR_USAGE,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: process.env.ANDROID_PACKAGE ?? 'com.REPLACE.tavinda',
    versionCode: Number(BUILD_NUMBER),
    adaptiveIcon: {
      backgroundColor: '#1C1B19',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['READ_CALENDAR'],
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 120,
        resizeMode: 'contain',
        backgroundColor: '#F7F5F0',
        dark: { image: './assets/splash-icon.png', backgroundColor: '#141312' },
      },
    ],
    ['expo-calendar', { calendarPermission: CALENDAR_USAGE, remindersPermission: false }],
    '@react-native-community/datetimepicker',
  ],
  experiments: { typedRoutes: true },
});
