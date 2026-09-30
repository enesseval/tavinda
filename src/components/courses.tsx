import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { dateAtTime, minutesToTime, timeToMinutes } from '../domain/dates';
import { t, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '../i18n/tr';
import type { OnboardingCourseDraft } from '../store/ui';
import { useTheme } from '../theme/theme';
import { radii } from '../theme/tokens';
import { colorFor, shortNameFor } from '../ui/courseDrafts';
import { AppText } from './AppText';
import { Button, Chip, Toggle } from './controls';

export function CandidateList({ drafts, onToggle }: { drafts: OnboardingCourseDraft[]; onToggle: (key: string) => void }) {
  const { c } = useTheme();
  return (
    <View
      style={{ borderRadius: radii.input, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}
    >
      {drafts.map((d, i) => (
        <Pressable
          key={d.key}
          accessibilityRole="switch"
          accessibilityState={{ checked: d.enabled }}
          accessibilityLabel={`${d.name}, ${WEEKDAYS_LONG[d.weekday - 1]} ${d.startTime}`}
          onPress={() => onToggle(d.key)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 60,
            marginLeft: 16,
            paddingRight: 16,
            paddingVertical: 8,
            borderBottomWidth: i < drafts.length - 1 ? 0.5 : 0,
            borderBottomColor: c.line,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.enabled ? d.color : c.ink3 }} />
          <View className="flex-1 gap-px">
            <AppText variant="bodyLarge" tone={d.enabled ? 'ink' : 'ink2'}>
              {d.name}
            </AppText>
            <AppText variant="footnote" tone="ink2" tabular>
              {WEEKDAYS_LONG[d.weekday - 1]} · {d.startTime}–{d.endTime}
            </AppText>
          </View>
          <Toggle label={d.name} value={d.enabled} onChange={() => onToggle(d.key)} />
        </Pressable>
      ))}
    </View>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View className="flex-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${value}`}
        onPress={() => setOpen((o) => !o)}
        style={{
          minHeight: 48,
          borderRadius: radii.input,
          borderWidth: 1,
          borderColor: open ? c.ink : c.line,
          backgroundColor: c.surface,
          paddingHorizontal: 14,
          justifyContent: 'center',
        }}
      >
        <AppText variant="caption" tone="ink2">
          {label}
        </AppText>
        <AppText variant="headline" tabular>
          {value}
        </AppText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={dateAtTime('2026-01-05', value)}
          mode="time"
          is24Hour
          locale="tr-TR"
          minuteInterval={5}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (e.type === 'set' && d) onChange(minutesToTime(d.getHours() * 60 + d.getMinutes()));
          }}
        />
      ) : null}
    </View>
  );
}

/** One row of the manual weekly grid: name + weekday + start/end. */
export function ManualCourseForm({
  existing,
  onAdd,
  onError,
}: {
  existing: { name: string; color: string }[];
  onAdd: (d: OnboardingCourseDraft) => void;
  onError: (msg: string) => void;
}) {
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:50');

  const submit = () => {
    if (!name.trim()) return onError(t.manual.nameFirst);
    if (timeToMinutes(end) <= timeToMinutes(start)) return onError(t.manual.invalidTime);
    onAdd({
      key: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      shortName: shortNameFor(name),
      color: colorFor(name, existing),
      source: 'manual',
      calendarEventId: null,
      weekday,
      startTime: start,
      endTime: end,
      enabled: true,
    });
    setName('');
  };

  return (
    <View className="gap-3">
      <View
        style={{
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radii.input,
          paddingHorizontal: 16,
        }}
      >
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t.manual.name}
          placeholderTextColor={c.ink3}
          maxLength={60}
          returnKeyType="done"
          maxFontSizeMultiplier={1.35}
          style={{ minHeight: 48, color: c.ink, fontSize: 17, paddingVertical: 12 }}
        />
      </View>
      <View className="gap-2">
        <AppText variant="label" tone="ink2">
          {t.manual.day}
        </AppText>
        <View className="flex-row flex-wrap gap-1.5">
          {WEEKDAYS_SHORT.map((w, i) => (
            <Chip key={w} label={w} small selected={weekday === i + 1} onPress={() => setWeekday(i + 1)} />
          ))}
        </View>
      </View>
      <View className="flex-row items-start gap-2.5">
        <TimeField label={t.manual.start} value={start} onChange={setStart} />
        <TimeField label={t.manual.end} value={end} onChange={setEnd} />
      </View>
      <Button label={t.manual.addRow} kind="secondary" onPress={submit} />
    </View>
  );
}

export function DraftList({ drafts, onRemove }: { drafts: OnboardingCourseDraft[]; onRemove?: (key: string) => void }) {
  const { c } = useTheme();
  if (!drafts.length) {
    return (
      <AppText variant="body" tone="ink3">
        {t.manual.none}
      </AppText>
    );
  }
  return (
    <View
      style={{ borderRadius: radii.input, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}
    >
      {drafts.map((d, i) => (
        <View
          key={d.key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 52,
            marginLeft: 16,
            paddingRight: 16,
            borderBottomWidth: i < drafts.length - 1 ? 0.5 : 0,
            borderBottomColor: c.line,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
          <View className="flex-1">
            <AppText variant="bodyLarge">{d.name}</AppText>
            <AppText variant="footnote" tone="ink2" tabular>
              {WEEKDAYS_LONG[d.weekday - 1]} · {d.startTime}–{d.endTime}
            </AppText>
          </View>
          {onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${d.name} ${t.common.delete}`}
              hitSlop={10}
              onPress={() => onRemove(d.key)}
            >
              <AppText variant="body" color={c.heat[3]}>
                {t.common.delete}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
