import type { ConfigContext, ExpoConfig } from 'expo/config';

// Every TestFlight upload needs a new build number: `npm run bump:build` edits this line.
const BUILD_NUMBER = '1';
const VERSION = '0.1.0';

// Expo Go only opens manifests the CLI can sign, which needs a logged-in Expo account
// and a project id from expo.dev. Only the id is used; no EAS Build or Update.
const EXPO_PROJECT_ID = process.env.EXPO_PROJECT_ID ?? '79d704ef-3413-4f79-85d0-90be30aad144';
const EXPO_OWNER = process.env.EXPO_OWNER ?? 'enesseval';

const CALENDAR_USAGE = 'Ders programını takviminden okumak için. Takvimine bir şey yazmayız.';
// Never requested, but must exist: expo-calendar reads the reminders permission status when
// its native module is created and raises a fatal exception if this key is missing, which
// aborts registration of every Expo module after it ("Cannot find native module ...").
// Shown only if the app ever asked for reminders, which it doesn't; worded for App Review.
const REMINDERS_USAGE = 'Tavında yalnızca takvimindeki ders programını okur. Anımsatıcılarına erişmez.';

const BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.REPLACE.tavinda';
// Shared container for the home/lock screen widget and the Live Activity (targets/widget).
export const APP_GROUP = `group.${BUNDLE_ID}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tavında',
  slug: 'tavinda',
  ...(EXPO_OWNER ? { owner: EXPO_OWNER } : {}),
  extra: {
    ...config.extra,
    ...(EXPO_PROJECT_ID ? { eas: { projectId: EXPO_PROJECT_ID } } : {}),
    appGroup: APP_GROUP,
  },
  scheme: 'tavinda',
  version: VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  locales: { tr: './locales/tr.json' },
  ios: {
    bundleIdentifier: BUNDLE_ID,
    buildNumber: BUILD_NUMBER,
    appleTeamId: process.env.APPLE_TEAM_ID,
    supportsTablet: false,
    entitlements: { 'com.apple.security.application-groups': [APP_GROUP] },
    infoPlist: {
      // Time blocks show as a Live Activity (lock screen + Dynamic Island).
      NSSupportsLiveActivities: true,
      CFBundleDevelopmentRegion: 'tr',
      CFBundleLocalizations: ['tr'],
      NSCalendarsUsageDescription: CALENDAR_USAGE,
      NSCalendarsFullAccessUsageDescription: CALENDAR_USAGE,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: process.env.ANDROID_PACKAGE ?? 'com.tavinda.app',
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
    // Builds the widget extension from targets/widget (home + lock screen widget, Live Activity).
    '@bacons/apple-targets',
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
    ['expo-calendar', { calendarPermission: CALENDAR_USAGE, remindersPermission: REMINDERS_USAGE }],
    '@react-native-community/datetimepicker',
  ],
  experiments: { typedRoutes: true },
});
