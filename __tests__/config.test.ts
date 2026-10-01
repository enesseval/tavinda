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
