import '../../global.css';

import { useFonts } from 'expo-font';
import { router, Stack, usePathname, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StartupError } from '../boot/BootGuard';
import { ToastHost } from '../components/Toast';
import { getDb } from '../db/client';
import { fixCourseCodes, runReconcile } from '../services/actions';
import { useNow } from '../services/clock';
import { onRefresh, useAppData } from '../services/data';
import { configureNotifications, listenForNotificationTaps, rescheduleNotifications } from '../services/notifications';
import { ThemeProvider, useTheme } from '../theme/theme';

/** Fonts are cosmetic; start with system fonts if they take longer than this. */
const FONT_TIMEOUT_MS = 2500;

function hideSplash() {
  SplashScreen.hideAsync().catch(() => undefined);
}

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Opens the DB (runs migrations), wires notifications to data changes and reconciles once.
 * Each step is announced before it runs and the JS thread yields in between, so if a step
 * ever hangs, the boot screen names it.
 */
async function boot(onStep: (step: string) => void): Promise<void> {
  const steps: [string, () => void][] = [
    ['veritabanı', () => void getDb()],
    [
      'bildirimler',
      () => {
        configureNotifications();
        onRefresh(rescheduleNotifications);
      },
    ],
    ['günlük düzenleme', () => runReconcile()],
    ['ders kodları', () => fixCourseCodes()],
  ];
  for (const [name, run] of steps) {
    onStep(name);
    await nextTick();
    try {
      run();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      err.message = `[${name}] ${err.message}`;
      throw err;
    }
  }
}

let bootPromise: Promise<void> | null = null;

/** Shown (instead of the splash) while booting; names the current step. */
function Booting({ step }: { step: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5F0' }}>
      <Text style={{ fontSize: 13, color: '#A8A399' }}>Açılıyor… {step}</Text>
    </View>
  );
}

/** expo-router renders this when any route throws. */
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
  // Tapping a "süre doldu" / "sırada ne var?" notification opens the matching sheet.
  useEffect(() => listenForNotificationTaps((url) => router.push(url as Href)), []);
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
        <Stack.Screen name="settings/hours" />
        <Stack.Screen name="block/new" options={sheet} />
        <Stack.Screen name="block/[id]" options={sheet} />
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
  const [step, setStep] = useState('başlatılıyor');
  const [status, setBoot] = useState<{ done: boolean; error: Error | null }>({ done: false, error: null });
  const [fontTimedOut, setFontTimedOut] = useState(false);

  useEffect(() => {
    // The JS side is alive: swap the native splash for the boot screen right away.
    hideSplash();
    let alive = true;
    bootPromise ??= boot(setStep);
    bootPromise.then(
      () => alive && setBoot({ done: true, error: null }),
      (e: unknown) => alive && setBoot({ done: true, error: e instanceof Error ? e : new Error(String(e)) }),
    );
    const fontTimer = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => {
      alive = false;
      clearTimeout(fontTimer);
    };
  }, []);

  if (status.error) return <StartupError error={status.error} />;

  const ready = status.done && (fontsLoaded || !!fontError || fontTimedOut);
  if (!ready) return <Booting step={status.done ? 'yazı tipleri' : step} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Themed />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
