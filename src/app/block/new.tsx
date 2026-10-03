import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button, Chip, CoursePill } from '../../components/controls';
import { PickerField, PickerSheet } from '../../components/PickerSheet';
import { Sheet } from '../../components/Sheet';
import { Touchable } from '../../components/Touchable';
import { minutesToTime, toLocalDate } from '../../domain/dates';
import { currentGap, endFromClock, suggestedBlockEnd } from '../../domain/schedule';
import { taskListModel } from '../../domain/taskList';
import type { BlockKind } from '../../domain/types';
import { fmtMinutes } from '../../i18n/format';
import { t } from '../../i18n/tr';
import { startBlock } from '../../services/actions';
import { getNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { useUi } from '../../store/ui';
import { useTheme } from '../../theme/theme';
import { radii } from '../../theme/tokens';

const KINDS: BlockKind[] = ['sleep', 'meal', 'rest', 'task', 'other'];
const hhmm = (d: Date) => minutesToTime(d.getHours() * 60 + d.getMinutes());

/** "Ne yapacaksın?" — fills the free time with a block that runs until the chosen time. */
export default function NewBlock() {
  const { c } = useTheme();
  const data = useAppData();
  const showToast = useUi((s) => s.showToast);
  const now = useMemo(() => getNow(), []);
  const gap = useMemo(() => currentGap(data, now), [data, now]);
  const tasks = useMemo(() => taskListModel(data, toLocalDate(now)).active, [data, now]);

  const [kind, setKind] = useState<BlockKind | null>(null);
  const [label, setLabel] = useState('');
  const [instanceId, setInstanceId] = useState<number | null>(null);
  const [end, setEnd] = useState(() => suggestedBlockEnd(data, now));
  const [picker, setPicker] = useState(false);

  const gapEnd = gap ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, gap.end) : null;
  const plus = (m: number) => setEnd(new Date(Math.ceil((now.getTime() + m * 60_000) / 300_000) * 300_000));

  const submit = () => {
    if (!kind) return showToast(t.blocks.pickKind);
    if (kind === 'task' && instanceId == null) return showToast(t.blocks.pickTaskFirst);
    startBlock({ kind, label: kind === 'other' ? label : null, instanceId: kind === 'task' ? instanceId : null, end });
    const name =
      kind === 'task'
        ? (tasks.find((x) => x.instance.id === instanceId)?.task.title ?? t.blocks.names.task)
        : kind === 'other'
          ? label.trim() || t.blocks.names.other
          : t.blocks.names[kind];
    showToast(t.blocks.started(name, hhmm(end)));
    router.back();
  };

  return (
    <Sheet scroll maxHeightRatio={0.92}>
      <View style={{ gap: 4 }}>
        <AppText variant="sheetTitle">{t.blocks.askTitle}</AppText>
        <AppText variant="body" tone="ink2" tabular>
          {gap ? t.blocks.askFree(minutesToTime(gap.start), minutesToTime(gap.end)) : t.blocks.askNow(hhmm(now))}
        </AppText>
      </View>

      <View style={{ gap: 8 }}>
        {KINDS.map((k) => {
          const on = kind === k;
          return (
            <Touchable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setKind(k)}
              style={{
                minHeight: 48,
                paddingHorizontal: 16,
                justifyContent: 'center',
                borderRadius: radii.input,
                borderWidth: 1,
                borderColor: on ? c.ink : c.line,
                backgroundColor: on ? c.ink : c.surface,
              }}
            >
              <AppText variant="bodyLarge" weight="500" color={on ? c.bg : c.ink}>
                {t.blocks.options[k]}
              </AppText>
            </Touchable>
          );
        })}
      </View>

      {kind === 'other' ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: radii.input,
            paddingHorizontal: 16,
            backgroundColor: c.surface,
          }}
        >
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder={t.blocks.otherPlaceholder}
            placeholderTextColor={c.ink3}
            maxLength={60}
            returnKeyType="done"
            style={{ minHeight: 48, color: c.ink, fontSize: 17, paddingVertical: 12 }}
          />
        </View>
      ) : null}

      {kind === 'task' ? (
        <View style={{ gap: 8 }}>
          <AppText variant="label" tone="ink2">
            {t.blocks.pickTask}
          </AppText>
          {tasks.length ? (
            tasks.map((i) => {
              const on = instanceId === i.instance.id;
              return (
                <Touchable
                  key={i.instance.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setInstanceId(i.instance.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 52,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: radii.input,
                    borderWidth: on ? 2 : 1,
                    borderColor: on ? c.ink : c.line,
                    backgroundColor: c.surface,
                  }}
                >
                  <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c.heat[i.heat] }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {i.task.title}
                    </AppText>
                    <AppText variant="caption" tone="ink2" tabular>
                      %{i.instance.progress} · ~{fmtMinutes(i.remainingMinutes)}
                    </AppText>
                  </View>
                  {i.course ? <CoursePill code={i.course.shortName} color={i.course.color} /> : null}
                </Touchable>
              );
            })
          ) : (
            <AppText variant="body" tone="ink3">
              {t.blocks.noTasks}
            </AppText>
          )}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <AppText variant="label" tone="ink2">
          {t.blocks.until}
        </AppText>
        <View style={{ flexDirection: 'row' }}>
          <PickerField label={t.blocks.untilLabel} value={hhmm(end)} active={picker} onPress={() => setPicker(true)} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip small label={t.blocks.quick.m30} selected={false} onPress={() => plus(30)} />
          <Chip small label={t.blocks.quick.h1} selected={false} onPress={() => plus(60)} />
          <Chip small label={t.blocks.quick.h2} selected={false} onPress={() => plus(120)} />
          {gapEnd && gapEnd > now ? (
            <Chip small label={t.blocks.quick.next} selected={false} onPress={() => setEnd(gapEnd)} />
          ) : null}
        </View>
      </View>

      <Button label={t.blocks.start} onPress={submit} />

      <PickerSheet
        visible={picker}
        mode="time"
        title={t.blocks.untilLabel}
        value={end}
        onCancel={() => setPicker(false)}
        onDone={(d) => {
          setEnd(endFromClock(getNow(), hhmm(d)));
          setPicker(false);
        }}
      />
    </Sheet>
  );
}
