// App entry. Replaces `expo-router/entry` so that a release build can never sit on the
// splash screen silently: the splash is hidden on a timer before any app code loads, and
// any startup error (including one thrown while a module is first evaluated) is shown on
// screen instead of being swallowed.
import '@expo/metro-runtime';

import * as SplashScreen from 'expo-splash-screen';
import { createElement } from 'react';

import { BootGuard, reportFatal } from './src/boot/BootGuard';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
setTimeout(() => SplashScreen.hideAsync().catch(() => undefined), 5000);

if (global.ErrorUtils) {
  const previous = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    SplashScreen.hideAsync().catch(() => undefined);
    // A fatal error would otherwise kill (or, on the new architecture, freeze) the app
    // with no message; show it instead.
    if (isFatal) reportFatal(error);
    else previous(error, isFatal);
  });
}

let App = null;
try {
  // require (not import) so a failure here is caught instead of hoisted above the guard.
  App = require('expo-router/build/qualified-entry').App;
} catch (e) {
  reportFatal(e);
}

function Root() {
  return createElement(BootGuard, null, App ? createElement(App) : null);
}

const { renderRootComponent } = require('expo-router/build/renderRootComponent');

renderRootComponent(Root);
