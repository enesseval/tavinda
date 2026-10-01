// App entry. Replaces `expo-router/entry` so that a release build can never sit on the
// splash screen silently: the splash is hidden on a timer before any app code loads, and
// any startup error (including one thrown while a module is first evaluated) is shown on
// screen instead of being swallowed.
import '@expo/metro-runtime';

import * as SplashScreen from 'expo-splash-screen';
import { createElement, useEffect, useState } from 'react';

import { BootGuard, reportFatal } from './src/boot/BootGuard';
import { hasExpoModule } from './src/boot/nativeDiagnostics';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
setTimeout(() => SplashScreen.hideAsync().catch(() => undefined), 8000);

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

/** expo-router needs ExpoLinking the moment it loads; wait for native modules first. */
const NATIVE_WAIT_MS = 5000;
const NATIVE_POLL_MS = 50;

function loadApp() {
  // require (not import) so a failure here is caught instead of hoisted above the guard.
  return require('expo-router/build/qualified-entry').App;
}

function Root() {
  const [App, setApp] = useState(null);
  useEffect(() => {
    const started = Date.now();
    let timer = null;
    const tick = () => {
      if (hasExpoModule('ExpoLinking') || Date.now() - started > NATIVE_WAIT_MS) {
        try {
          const app = loadApp();
          setApp(() => app);
        } catch (e) {
          reportFatal(e);
        }
        return;
      }
      timer = setTimeout(tick, NATIVE_POLL_MS);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return createElement(BootGuard, null, App ? createElement(App) : null);
}

const { renderRootComponent } = require('expo-router/build/renderRootComponent');

renderRootComponent(Root);
