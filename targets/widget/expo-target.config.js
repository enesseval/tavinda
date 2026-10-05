// Widget extension: home + lock screen "Bugün" widget and the time-block Live Activity.
// Generated into the Xcode project by @bacons/apple-targets on `expo prebuild`.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'TavindaWidget',
  displayName: 'Tavında',
  bundleIdentifier: '.widget',
  // Live Activities need iOS 16.2; the app itself still runs on 15.1.
  deploymentTarget: '16.2',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: {
    // Asset names are the keys; Swift reads them as Color("$accent") / Color("$widgetBackground").
    $accent: { light: '#1C1B19', dark: '#F2EFE9' },
    $widgetBackground: { light: '#F7F5F0', dark: '#141312' },
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
