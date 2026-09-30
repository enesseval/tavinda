import '../../global.css';

import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
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

let booted = false;

/** Opens the DB (runs migrations), wires notifications to data changes and reconciles once. */
function bootOnce(): void {
  if (booted) return;
  booted = true;
  getDb();
  configureNotifications();
  onRefresh(rescheduleNotifications);
  runReconcile();
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
  const [dbReady, setDbReady] = useState(false);
  useEffect(() => {
    bootOnce();
    setDbReady(true);
  }, []);
  const ready = dbReady && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>{ready ? <Themed /> : null}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
