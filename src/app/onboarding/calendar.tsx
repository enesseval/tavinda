import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { CalendarPrimingArt } from '../../components/icons';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { t } from '../../i18n/tr';
import { requestCalendarPermission } from '../../services/calendar';
import { useTheme } from '../../theme/theme';

/** Priming screen shown before the system calendar prompt. */
export default function OnboardingCalendar() {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    const ok = await requestCalendarPermission();
    setBusy(false);
    router.push(ok ? '/onboarding/map' : '/onboarding/manual');
  };

  return (
    <OnboardingFrame
      step={2}
      footer={
        <View style={{ gap: 4 }}>
          <Button label={t.onboarding.calConnect} onPress={connect} disabled={busy} />
          <Button label={t.onboarding.calManual} kind="ghost" onPress={() => router.push('/onboarding/manual')} />
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 28 }}>
        <CalendarPrimingArt color={c.ink2} />
        <View style={{ gap: 12 }}>
          <AppText variant="display" accessibilityRole="header">
            {t.onboarding.calTitle}
          </AppText>
          <AppText variant="bodyLarge" tone="ink2" style={{ lineHeight: 24 }}>
            {t.onboarding.calBody}
          </AppText>
        </View>
      </View>
    </OnboardingFrame>
  );
}
