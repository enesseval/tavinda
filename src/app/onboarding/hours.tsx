import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { DayHoursEditor } from '../../components/DayHoursEditor';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { t } from '../../i18n/tr';

/** Asks how long the user's day is before the app starts filling it. */
export default function OnboardingHours() {
  return (
    <OnboardingFrame
      step={5}
      footer={<Button label={t.common.continue} onPress={() => router.push('/onboarding/notifications')} />}
    >
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}>
        <AppText variant="display" accessibilityRole="header">
          {t.hours.onbTitle}
        </AppText>
        <AppText variant="bodyLarge" tone="ink2" style={{ lineHeight: 24 }}>
          {t.hours.onbBody}
        </AppText>
        <DayHoursEditor />
      </ScrollView>
    </OnboardingFrame>
  );
}
