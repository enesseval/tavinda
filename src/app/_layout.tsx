import '../../global.css';

import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastHost } from '../components/Toast';
import { getDb } from '../db/client';
import { runReconcile } from '../services/actions';
import { useNow } from '../services/clock';
import { onRefresh, useAppData } from '../services/data';
import { configureNotifications, rescheduleNotifications } from '../services/notifications';
import { ThemeProvider, useTheme } from '../theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Never leave the user on the splash screen: hide it after this long no matter what. */
const SPLASH_FAILSAFE_MS = 4000;
/** Fonts are cosmetic; start with system fonts if they take longer than this. */
const FONT_TIMEOUT_MS = 2500;

function hideSplash() {
  SplashScreen.hideAsync().catch(() => undefined);
}

// Errors outside React (timers, promises) must not leave the splash on screen either.
const errorUtils = (
  globalThis as {
    ErrorUtils?: {
      getGlobalHandler(): (e: unknown, fatal?: boolean) => void;
      setGlobalHandler(h: (e: unknown, fatal?: boolean) => void): void;
    };
  }
).ErrorUtils;
if (errorUtils) {
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((e, fatal) => {
    hideSplash();
    previous(e, fatal);
  });
}

let bootError: Error | null = null;
let booted = false;

/** Opens the DB (runs migrations), wires notifications to data changes and reconciles once. */
function bootOnce(): Error | null {
  if (booted) return bootError;
  booted = true;
  let step = 'veritabanı';
  try {
    getDb();
    step = 'bildirimler';
    configureNotifications();
    onRefresh(rescheduleNotifications);
    step = 'günlük düzenleme';
    runReconcile();
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    err.message = `[${step}] ${err.message}`;
    bootError = err;
  }
  return bootError;
}

/** Plain, dependency-free error screen so a release build shows what went wrong instead of hanging. */
function StartupError({ error, retry }: { error: Error; retry?: () => void }) {
  useEffect(hideSplash, []);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F7F5F0' }} contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#1C1B19' }}>Tavında açılamadı</Text>
      <Text style={{ fontSize: 15, color: '#6B675F' }}>Bu ekranın görüntüsünü gönder; hatayı buradan bulacağız.</Text>
      <Text selectable style={{ fontSize: 13, color: '#A3122A', fontFamily: 'Menlo' }}>
        {error.name}: {error.message}
      </Text>
      <Text selectable style={{ fontSize: 11, color: '#6B675F', fontFamily: 'Menlo' }}>
        {(error.stack ?? '').split('\n').slice(0, 12).join('\n')}
      </Text>
      {retry ? (
        <Text onPress={retry} style={{ fontSize: 17, fontWeight: '600', color: '#1C1B19', paddingVertical: 12 }}>
          Tekrar dene
        </Text>
      ) : null}
    </ScrollView>
  );
}

/** expo-router renders this when any route throws; it also hides the splash. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <StartupError error={error} retry={() => void retry()} />;
}

/** Re-runs reconcile whenever the logical day changes (midnight → cut-off, time travel, foreground). */
function DayWatcher() {
  const { today } = useNow();
  useEffect(() => {
    runReconcile(today);
  }, [today]);
  return null;
}

function Toasts() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const onTabs = path === '/' || path === '/calendar' || path === '/profile';
  return <ToastHost bottom={onTabs ? insets.bottom + 49 + 88 : insets.bottom + 96} />;
}

function AppStack() {
  const { c, scheme } = useTheme();
  const sheet = {
    presentation: 'transparentModal',
    animation: 'none',
    contentStyle: { backgroundColor: 'transparent' },
  } as const;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="add" options={{ presentation: 'modal', contentStyle: { backgroundColor: c.bg } }} />
        <Stack.Screen name="progress/[id]" options={sheet} />
        <Stack.Screen name="lock/[id]" options={sheet} />
        <Stack.Screen name="day/[date]" options={sheet} />
        <Stack.Screen name="window/[id]" options={sheet} />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="courses/index" />
        <Stack.Screen name="courses/manual" />
        <Stack.Screen name="courses/import" />
        <Stack.Screen name="settings/calendars" />
      </Stack>
      <DayWatcher />
      <Toasts />
    </View>
  );
}

function Themed() {
  const data = useAppData();
  return (
    <ThemeProvider pref={data.settings.theme}>
      <AppStack />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold: require('../../assets/fonts/BricolageGrotesque_600SemiBold.ttf'),
    BricolageGrotesque_700Bold: require('../../assets/fonts/BricolageGrotesque_700Bold.ttf'),
  });
  const [boot, setBoot] = useState<{ done: boolean; error: Error | null }>({ done: false, error: null });
  const [fontTimedOut, setFontTimedOut] = useState(false);

  useEffect(() => {
    setBoot({ done: true, error: bootOnce() });
    const fontTimer = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    const splashTimer = setTimeout(hideSplash, SPLASH_FAILSAFE_MS);
    return () => {
      clearTimeout(fontTimer);
      clearTimeout(splashTimer);
    };
  }, []);

  const ready = boot.done && (fontsLoaded || !!fontError || fontTimedOut);

  useEffect(() => {
    if (ready) hideSplash();
  }, [ready]);

  if (boot.error) return <StartupError error={boot.error} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>{ready ? <Themed /> : null}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
