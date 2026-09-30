import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button, CloseButton } from '../../components/controls';
import { HeatGlyph, LockIcon } from '../../components/icons';
import { ProgressRing } from '../../components/ProgressRing';
import { ProgressSlider } from '../../components/ProgressSlider';
import { Sheet } from '../../components/Sheet';
import { remainingMinutes } from '../../domain/heat';
import { fmtMinutes } from '../../i18n/format';
import { HEAT_NAMES, t } from '../../i18n/tr';
import { saveProgress } from '../../services/actions';
import { useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { reliefLine } from '../../ui/taskText';
import { useInstanceItem } from '../../ui/useItem';
import { useTaskActions } from '../../ui/useTaskActions';

export default function ProgressSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { item, today } = useInstanceItem(Number(id));
  const [val, setVal] = useState(item?.instance.progress ?? 0);
  const showToast = useUi((s) => s.showToast);
  const actions = useTaskActions(today);

  useEffect(() => {
    if (!item) router.back();
  }, [item]);
  if (!item) return null;

  const color = c.heat[item.heat];
  const close = () => router.back();

  const save = () => {
    const receipt = saveProgress(item.instance.id, val);
    close();
    if (!receipt) return;
    if (val >= 100) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      showToast(t.toast.done(reliefLine(item, today)), receipt);
    } else {
      showToast(t.toast.saved(100 - val, fmtMinutes(remainingMinutes(val, item.task.estimatedMinutes))));
    }
  };

  const defer = () => {
    close();
    actions.defer(item);
  };

  const quick = (v: number) => {
    Haptics.selectionAsync().catch(() => undefined);
    setVal(v);
  };

  return (
    <Sheet scroll>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 8, flexShrink: 1 }}>
          <AppText variant="title">{item.task.title}</AppText>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: c.surface2,
            }}
          >
            {item.heat === 4 ? <LockIcon color={color} size={11} /> : <HeatGlyph color={color} level={item.heat} size={12} />}
            <AppText variant="caption" tone="ink2">
              {HEAT_NAMES[item.heat]}
              {item.course ? ` · ${item.course.shortName}` : ''}
            </AppText>
          </View>
        </View>
        <CloseButton onPress={close} />
      </View>

      <View style={{ alignSelf: 'center' }}>
        <ProgressRing size={120} stroke={8} progress={val} color={color} track={c.surface2}>
          <AppText variant="display" tabular style={{ letterSpacing: -0.5 }}>
            %{val}
          </AppText>
          <AppText variant="caption" tone="ink2">
            {t.progress.done}
          </AppText>
        </ProgressRing>
      </View>

      <ProgressSlider value={val} onChange={setVal} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { v: 25, label: '%25' },
          { v: 50, label: '%50' },
          { v: 100, label: t.progress.quickDone },
        ].map((q) => (
          <Button
            key={q.v}
            label={q.label}
            kind="secondary"
            small
            onPress={() => quick(q.v)}
            style={{ flex: 1, borderRadius: 999, borderColor: val === q.v ? c.ink : c.line }}
          />
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Button label={t.progress.save} onPress={save} />
        {item.instance.status !== 'active' ? null : item.deferState === 'locked' ? (
          <Button label={t.progress.locked} kind="locked" disabled />
        ) : item.deferState === 'lastChance' ? (
          <Button label={t.progress.deferLastChance} kind="lastChance" onPress={defer} />
        ) : (
          <Button label={t.progress.deferRest} kind="secondary" onPress={defer} />
        )}
      </View>
    </Sheet>
  );
}
