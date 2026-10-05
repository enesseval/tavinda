import { Redirect, router, Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { CalendarTabIcon, ProfileTabIcon, TasksTabIcon, TodayTabIcon } from '../../components/icons';
import { t } from '../../i18n/tr';
import { useAppData } from '../../services/data';
import { useTheme } from '../../theme/theme';
import { Touchable } from '../../components/Touchable';
import { TabAddButton } from '../../components/Fab';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const items = [
    { name: 'index', label: t.tabs.today, Icon: TodayTabIcon },
    { name: 'calendar', label: t.tabs.calendar, Icon: CalendarTabIcon },
    { name: 'tasks', label: t.tabs.tasks, Icon: TasksTabIcon },
    { name: 'profile', label: t.tabs.profile, Icon: ProfileTabIcon },
  ];
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        paddingTop: 7,
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: c.bar,
        borderTopWidth: 0.5,
        borderTopColor: c.line,
      }}
    >
      {items.map(({ name, label, Icon }, i) => {
        const index = state.routes.findIndex((r) => r.name === name);
        const focused = state.index === index;
        const color = focused ? c.ink : c.ink3;
        return [
          i === 2 ? <TabAddButton key="add" /> : null,
          <Touchable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const route = state.routes[index];
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3, minHeight: 44 }}
          >
            <Icon color={color} bg={c.bg} active={focused} />
            <AppText variant="tab" color={color} maxFontSizeMultiplier={1.2}>
              {label}
            </AppText>
          </Touchable>,
        ];
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { settings } = useAppData();
  const { c } = useTheme();
  // First visit after onboarding (or after updating): explain the ideas once.
  const showIntro = settings.onboarded && !settings.seenIntro;
  useEffect(() => {
    if (!showIntro) return;
    const tm = setTimeout(() => router.push('/intro'), 400);
    return () => clearTimeout(tm);
  }, [showIntro]);
  if (!settings.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
