import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { t } from '../../i18n/tr';
import { finishOnboarding } from '../../services/actions';
import { requestNotificationPermission } from '../../services/notifications';
import { DEFAULT_PICK, useOnboarding } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { draftToCourse, groupCourses } from '../../ui/courseDrafts';

function SampleNotification({ time, body, dim }: { time: string; body: string; dim?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 20,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        opacity: dim ? 0.7 : 1,
        transform: [{ scale: dim ? 0.97 : 1 }],
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          backgroundColor: c.ink,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 2,
          paddingBottom: 9,
        }}
      >
        <View style={{ width: 4, height: 8, borderRadius: 2, backgroundColor: c.heat[0] }} />
        <View style={{ width: 4, height: 13, borderRadius: 2, backgroundColor: c.heat[2] }} />
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: c.heat[4] }} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="bodyStrong">Tavında</AppText>
          <AppText variant="footnote" tone="ink3">
            {time}
          </AppText>
        </View>
        <AppText variant="body">{body}</AppText>
      </View>
    </View>
  );
}

export default function OnboardingNotifications() {
  const { c } = useTheme();
  const drafts = useOnboarding((s) => s.courses);
  const picks = useOnboarding((s) => s.picks);
  const [done, setDone] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async (ask: boolean) => {
    setBusy(true);
    if (ask) await requestNotificationPermission();
    const enabled = drafts.filter((d) => d.enabled);
    const count = finishOnboarding({
      courses: enabled.map(draftToCourse),
      // Templates belong to a course's first day; its other days carry no extra weekly tasks.
      templates: enabled.map((d) => {
        const first = groupCourses(enabled).find((g) => g.slots.includes(d))?.slots[0];
        return first === d ? (picks[d.key] ?? DEFAULT_PICK) : [];
      }),
      estimatedMinutes: 45,
    });
    setDone(count);
    setBusy(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <OnboardingFrame
        step={5}
        footer={
          <View style={{ gap: 4 }}>
            <Button label={t.onboarding.notifAllow} onPress={() => finish(true)} disabled={busy} />
            <Button label={t.onboarding.notifLater} kind="ghost" onPress={() => finish(false)} disabled={busy} />
          </View>
        }
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 32 }}>
          <View style={{ gap: 10 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <SampleNotification time="08:30" body={t.onboarding.notifSample1} />
            <SampleNotification time="20:00" body={t.onboarding.notifSample2} dim />
          </View>
          <AppText variant="display" accessibilityRole="header">
            {t.onboarding.notifTitle}
          </AppText>
        </View>
      </OnboardingFrame>

      {done != null ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: c.bg,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            paddingHorizontal: 32,
          }}
        >
          <AppText variant="display" center>
            {t.onboarding.readyTitle}
          </AppText>
          <AppText variant="bodyLarge" tone="ink2" center style={{ lineHeight: 24 }}>
            {t.onboarding.readyBody(done)}
          </AppText>
          <Button
            label={t.onboarding.goToday}
            onPress={() => router.replace('/')}
            style={{ alignSelf: 'stretch', marginTop: 16 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
