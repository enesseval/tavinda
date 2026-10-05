/**
 * Native modules read these Info.plist keys when they are created; a missing one raises a
 * fatal exception that stops every later Expo module from registering on iOS.
 */
import type { ExpoConfig } from 'expo/config';

import appConfig from '../app.config';

const config = appConfig({ config: {} } as never) as ExpoConfig;

function pluginOptions(name: string): Record<string, unknown> {
  const entry = config.plugins?.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  return Array.isArray(entry) ? (entry[1] as Record<string, unknown>) : {};
}

test('expo-calendar has both calendar and reminders usage descriptions', () => {
  const opts = pluginOptions('expo-calendar');
  expect(typeof opts.calendarPermission).toBe('string');
  expect(typeof opts.remindersPermission).toBe('string');
});

test('iOS calendar usage descriptions are set directly too', () => {
  expect(config.ios?.infoPlist?.NSCalendarsUsageDescription).toEqual(expect.any(String));
  expect(config.ios?.infoPlist?.NSCalendarsFullAccessUsageDescription).toEqual(expect.any(String));
});

test('Android keeps both calendar permissions (expo-calendar asks for read and write together)', () => {
  expect(config.android?.permissions).toContain('READ_CALENDAR');
  expect(config.android?.blockedPermissions ?? []).not.toContain('android.permission.WRITE_CALENDAR');
});

test('release signing plugin patches the prebuild template once', () => {
  const { apply } = require('../plugins/withAndroidReleaseSigning');
  // Excerpt of android/app/build.gradle from the SDK 54 prebuild template.
  const template = [
    '    signingConfigs {',
    '        debug {',
    "            storeFile file('debug.keystore')",
    "            storePassword 'android'",
    "            keyAlias 'androiddebugkey'",
    "            keyPassword 'android'",
    '        }',
    '    }',
    '    buildTypes {',
    '        debug {',
    '            signingConfig signingConfigs.debug',
    '        }',
    '        release {',
    '            // Caution! In production, you need to generate your own keystore file.',
    '            // see https://reactnative.dev/docs/signed-apk-android.',
    '            signingConfig signingConfigs.debug',
    '        }',
    '    }',
  ].join('\n');
  const out = apply(template);
  expect(out).toContain("System.getenv('ANDROID_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug");
  expect(out.match(/signingConfig signingConfigs\.debug/g)).toHaveLength(1); // debug build type only
  expect(apply(out)).toBe(out);
});
