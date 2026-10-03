import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { dateAtTime, minutesToTime, timeToMinutes } from '../domain/dates';
import { t, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '../i18n/tr';
import type { OnboardingCourseDraft } from '../store/ui';
import { useTheme } from '../theme/theme';
import { radii } from '../theme/tokens';
import { colorFor, groupCourses, shortNameFor } from '../ui/courseDrafts';
import { upperTr } from '../i18n/format';
import { PickerField, PickerSheet } from './PickerSheet';
import { AppText } from './AppText';
import { Button, Toggle } from './controls';
import { Touchable } from './Touchable';

export function CandidateList({ drafts, onToggle }: { drafts: OnboardingCourseDraft[]; onToggle: (key: string) => void }) {
  const { c } = useTheme();
  return (
    <View
      style={{ borderRadius: radii.input, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}
    >
      {drafts.map((d, i) => (
        <Touchable
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
        </Touchable>
      ))}
    </View>
  );
}

export interface SlotDraft {
  key: string;
  /** Existing course row when editing. */
  id?: number;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface CourseFormValue {
  name: string;
  shortName: string;
  color: string;
  slots: SlotDraft[];
}

let slotSeq = 0;
const newSlotKey = () => `slot-${Date.now()}-${++slotSeq}`;

function defaultSlot(prev?: SlotDraft): SlotDraft {
  if (!prev) return { key: newSlotKey(), weekday: 1, startTime: '09:00', endTime: '10:50' };
  // Mon → Wed → Fri is the common pattern; keep the same hours.
  const weekday = prev.weekday + 2 <= 7 ? prev.weekday + 2 : Math.min(7, prev.weekday + 1);
  return { key: newSlotKey(), weekday, startTime: prev.startTime, endTime: prev.endTime };
}

/**
 * One course with all the days it meets, each at its own hours. Time pickers
 * open in a sheet, one at a time, so the form never shifts.
 */
export function CourseForm({
  existing,
  initial,
  submitLabel,
  onSubmit,
  onError,
  resetAfterSubmit,
}: {
  existing: { name: string; shortName: string; color: string }[];
  initial?: CourseFormValue;
  submitLabel: string;
  onSubmit: (v: CourseFormValue) => void;
  onError: (msg: string) => void;
  resetAfterSubmit?: boolean;
}) {
  const { c } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.shortName ?? '');
  const [codeTouched, setCodeTouched] = useState(!!initial);
  const [slots, setSlots] = useState<SlotDraft[]>(initial?.slots.length ? initial.slots : [defaultSlot()]);
  const [picker, setPicker] = useState<{ key: string; field: 'startTime' | 'endTime' } | null>(null);

  const others = existing.filter(
    (e) => !initial || e.name.trim().toLocaleLowerCase('tr-TR') !== initial.name.trim().toLocaleLowerCase('tr-TR'),
  );
  const autoCode = name.trim() ? shortNameFor(name, others) : '';
  const shownCode = codeTouched ? code : autoCode;
  const pickerSlot = picker ? slots.find((x) => x.key === picker.key) : undefined;

  const patch = (key: string, p: Partial<SlotDraft>) => setSlots((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const submit = () => {
    if (!name.trim()) return onError(t.manual.nameFirst);
    if (!slots.length) return onError(t.manual.addDayFirst);
    if (slots.some((x) => timeToMinutes(x.endTime) <= timeToMinutes(x.startTime))) return onError(t.manual.invalidTime);
    const finalCode = upperTr((shownCode || autoCode).trim()).slice(0, 6);
    if (others.some((e) => upperTr(e.shortName) === finalCode)) return onError(t.manual.codeTaken(finalCode));
    onSubmit({
      name: name.trim(),
      shortName: finalCode,
      color: initial?.color ?? colorFor(name, others),
      slots,
    });
    if (resetAfterSubmit) {
      setName('');
      setCode('');
      setCodeTouched(false);
      setSlots([defaultSlot()]);
    }
  };

  const input = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: radii.input,
    paddingHorizontal: 16,
  } as const;

  return (
    <View className="gap-3">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[input, { flex: 1 }]}>
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
        <View style={[input, { width: 92, paddingHorizontal: 12 }]}>
          <TextInput
            value={shownCode}
            onChangeText={(v) => {
              setCodeTouched(true);
              setCode(upperTr(v));
            }}
            placeholder={t.manual.code}
            placeholderTextColor={c.ink3}
            autoCapitalize="characters"
            maxLength={6}
            accessibilityLabel={t.manual.code}
            maxFontSizeMultiplier={1.35}
            style={{ minHeight: 48, color: c.ink, fontSize: 17, fontWeight: '600', paddingVertical: 12 }}
          />
        </View>
      </View>
      <AppText variant="footnote" tone="ink2" style={{ paddingHorizontal: 4, marginTop: -4 }}>
        {t.manual.codeNote}
      </AppText>

      {slots.map((slot, i) => (
        <View
          key={slot.key}
          style={{
            borderRadius: radii.input,
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.surface,
            padding: 12,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="label" tone="ink2">
              {t.manual.dayN(i + 1)}
            </AppText>
            {slots.length > 1 ? (
              <Touchable
                accessibilityRole="button"
                accessibilityLabel={`${t.manual.dayN(i + 1)} ${t.common.delete}`}
                hitSlop={10}
                onPress={() => setSlots((xs) => xs.filter((x) => x.key !== slot.key))}
              >
                <AppText variant="footnote" color={c.heat[3]}>
                  {t.common.delete}
                </AppText>
              </Touchable>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {WEEKDAYS_SHORT.map((w, d) => {
              const on = slot.weekday === d + 1;
              return (
                <Touchable
                  key={w}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={WEEKDAYS_LONG[d]}
                  onPress={() => patch(slot.key, { weekday: d + 1 })}
                  style={{
                    flex: 1,
                    minHeight: 36,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: on ? c.ink : c.line,
                    backgroundColor: on ? c.ink : c.surface,
                  }}
                >
                  <AppText variant="footnote" weight="500" color={on ? c.bg : c.ink} maxFontSizeMultiplier={1.1}>
                    {w}
                  </AppText>
                </Touchable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PickerField
              label={t.manual.start}
              value={slot.startTime}
              active={picker?.key === slot.key && picker.field === 'startTime'}
              onPress={() => setPicker({ key: slot.key, field: 'startTime' })}
            />
            <PickerField
              label={t.manual.end}
              value={slot.endTime}
              active={picker?.key === slot.key && picker.field === 'endTime'}
              onPress={() => setPicker({ key: slot.key, field: 'endTime' })}
            />
          </View>
        </View>
      ))}
      <Button
        label={t.manual.addDay}
        kind="ghost"
        small
        onPress={() => setSlots((xs) => [...xs, defaultSlot(xs[xs.length - 1])])}
      />
      <Button label={submitLabel} kind="secondary" onPress={submit} />

      <PickerSheet
        visible={!!picker && !!pickerSlot}
        mode="time"
        title={picker?.field === 'endTime' ? t.manual.end : t.manual.start}
        value={dateAtTime('2026-01-05', pickerSlot ? pickerSlot[picker!.field] : '09:00')}
        onCancel={() => setPicker(null)}
        onDone={(d) => {
          if (picker) {
            const v = minutesToTime(d.getHours() * 60 + d.getMinutes());
            const slot = slots.find((x) => x.key === picker.key);
            if (slot && picker.field === 'startTime' && timeToMinutes(slot.endTime) <= timeToMinutes(v)) {
              // Keep the class length when the start moves past the end.
              const len = Math.max(50, timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime));
              patch(picker.key, { startTime: v, endTime: minutesToTime(Math.min(23 * 60 + 55, timeToMinutes(v) + len)) });
            } else {
              patch(picker.key, { [picker.field]: v });
            }
          }
          setPicker(null);
        }}
      />
    </View>
  );
}

/** Turns a submitted course into onboarding drafts (one per day it meets). */
export function formToDrafts(v: CourseFormValue): OnboardingCourseDraft[] {
  return v.slots.map((x) => ({
    key: `manual-${x.key}`,
    name: v.name,
    shortName: v.shortName,
    color: v.color,
    source: 'manual' as const,
    calendarEventId: null,
    weekday: x.weekday,
    startTime: x.startTime,
    endTime: x.endTime,
    enabled: true,
  }));
}

/** 'Pzt 09:00–10:50 · Çar 13:00–14:50' */
export function slotsLine(slots: { weekday: number; startTime: string; endTime: string }[]): string {
  return slots.map((x) => `${WEEKDAYS_SHORT[x.weekday - 1]} ${x.startTime}–${x.endTime}`).join(' · ');
}

export function DraftList({ drafts, onRemove }: { drafts: OnboardingCourseDraft[]; onRemove?: (keys: string[]) => void }) {
  const { c } = useTheme();
  if (!drafts.length) {
    return (
      <AppText variant="body" tone="ink3">
        {t.manual.none}
      </AppText>
    );
  }
  const groups = groupCourses(drafts);
  return (
    <View
      style={{ borderRadius: radii.input, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}
    >
      {groups.map((g, i) => (
        <View
          key={g.key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 52,
            marginLeft: 16,
            paddingRight: 16,
            paddingVertical: 8,
            borderBottomWidth: i < groups.length - 1 ? 0.5 : 0,
            borderBottomColor: c.line,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: g.color }} />
          <View className="flex-1">
            <AppText variant="bodyLarge">
              {g.name}{' '}
              <AppText variant="footnote" tone="ink3">
                · {g.shortName}
              </AppText>
            </AppText>
            <AppText variant="footnote" tone="ink2" tabular>
              {slotsLine(g.slots)}
            </AppText>
          </View>
          {onRemove ? (
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={`${g.name} ${t.common.delete}`}
              hitSlop={10}
              onPress={() => onRemove(g.slots.map((x) => x.key))}
            >
              <AppText variant="body" color={c.heat[3]}>
                {t.common.delete}
              </AppText>
            </Touchable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
