import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../components/AppText';
import { ToastHost } from '../components/Toast';
import { Button, Chip, Grabber, SectionLabel, Stepper } from '../components/controls';
import { ChevronLeft, DoneBadge, FlagIcon, LockIcon, RepeatIcon } from '../components/icons';
import { addDays, diffDays, parseLocalDate, toLocalDate } from '../domain/dates';
import { deadlineHeatValues, deadlinePreviewRamp, suggestedDailyShare, weeklyBaseHeat } from '../domain/heat';
import type { Course, Task } from '../domain/types';
import { currentWeeklyWindow } from '../domain/windows';
import { fmtLongDay, fmtMinutes, fmtShortDate, fmtWeekdayShort } from '../i18n/format';
import { HEAT_NAMES_LOWER, t, TEMPLATES, WEEKDAYS_SHORT } from '../i18n/tr';
import { createDeadlineTask, createWeeklyTask, updateTask } from '../services/actions';
import { useNow } from '../services/clock';
import { useAppData } from '../services/data';
import { useUi } from '../store/ui';
import { useTheme } from '../theme/theme';
import { mix, radii, type ColorTokens } from '../theme/tokens';

type Step = 'choose' | 'weekly' | 'deadline';

function Field({
  value,
  onChange,
  placeholder,
  c,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  c: ColorTokens;
}) {
  return (
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
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.ink3}
        returnKeyType="done"
        maxLength={80}
        maxFontSizeMultiplier={1.35}
        style={{ minHeight: 48, color: c.ink, fontSize: 17, paddingVertical: 12 }}
      />
    </View>
  );
}

function Row({
  label,
  value,
  strong,
  icon,
  last,
  onPress,
  c,
}: {
  label: string;
  value: string;
  strong?: boolean;
  icon?: ReactNode;
  last?: boolean;
  onPress?: () => void;
  c: ColorTokens;
}) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 48,
        marginLeft: 16,
        paddingRight: 16,
        paddingVertical: 8,
        gap: 12,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: c.line,
      }}
    >
      <AppText variant="bodyLarge">{label}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        {icon}
        <AppText
          variant="bodyLarge"
          weight={strong ? '600' : '400'}
          tone={strong ? 'ink' : 'ink2'}
          tabular
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export default function AddTask() {
  const params = useLocalSearchParams<{ taskId?: string; kind?: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const { today } = useNow();
  const showToast = useUi((s) => s.showToast);

  const editing: Task | null = params.taskId ? (data.tasks.find((x) => x.id === Number(params.taskId)) ?? null) : null;
  const courses = data.courses;

  const [step, setStep] = useState<Step>(
    editing ? editing.kind : params.kind === 'weekly' ? 'weekly' : params.kind === 'deadline' ? 'deadline' : 'choose',
  );
  const [added, setAdded] = useState<string | null>(null);

  // Weekly form
  const [wTitle, setWTitle] = useState(editing?.kind === 'weekly' ? editing.title : '');
  const [wCourse, setWCourse] = useState<number | null>(editing?.kind === 'weekly' ? editing.courseId : (courses[0]?.id ?? null));
  const [wEst, setWEst] = useState(editing?.kind === 'weekly' ? editing.estimatedMinutes : 45);

  // Deadline form
  const [dTitle, setDTitle] = useState(editing?.kind === 'deadline' ? editing.title : '');
  const [dCourse, setDCourse] = useState<number | null>(editing?.kind === 'deadline' ? editing.courseId : null);
  const [dDue, setDDue] = useState(editing?.kind === 'deadline' && editing.dueAt ? editing.dueAt : addDays(today, 14));
  const [dHours, setDHours] = useState(
    editing?.kind === 'deadline' ? Math.max(1, Math.round(editing.estimatedMinutes / 60)) : 10,
  );
  const [dDaily, setDDaily] = useState(editing?.dailyBudgetMinutes ?? data.settings.dailyBudgetMinutes);
  const [dWarn, setDWarn] = useState(editing?.warnDays ?? data.settings.warnDays);
  const [picker, setPicker] = useState(false);

  const weeklyCourse: Course | undefined = courses.find((k) => k.id === wCourse);
  const win = weeklyCourse ? currentWeeklyWindow(today, weeklyCourse.weekday) : null;
  const winLen = win ? diffDays(win.end, win.start) + 1 : 7;
  const ramp = win
    ? Array.from({ length: winLen }, (_, i) => ({ day: addDays(win.start, i), heat: weeklyBaseHeat(i, winLen) }))
    : [];
  const coolDays = ramp.findIndex((r) => r.heat > 0);

  const preview = useMemo(() => {
    const due = dDue < today ? today : dDue;
    const span = diffDays(due, today) + 1;
    const total = dHours * 60;
    const base = deadlineHeatValues({ today, due, progress: 0, estimatedMinutes: total, dailyBudget: dDaily, warnDays: dWarn });
    const share = suggestedDailyShare(total, span);
    return {
      base,
      text: share <= dDaily ? t.add.previewEarly(fmtMinutes(share)) : t.add.previewTight(fmtMinutes(dDaily), fmtMinutes(share)),
      segs: deadlinePreviewRamp({ spanDays: span, base, warnDays: dWarn, segments: 24 }),
      end: fmtShortDate(due),
    };
  }, [dDue, dHours, dDaily, dWarn, today]);

  const title = step === 'weekly' ? wTitle : dTitle;
  const valid = title.trim().length > 0 && (step !== 'weekly' || wCourse != null);

  const submit = () => {
    if (!title.trim()) {
      showToast(t.add.nameFirst);
      return;
    }
    if (step === 'weekly') {
      if (wCourse == null || !weeklyCourse || !win) {
        showToast(t.add.pickCourse);
        return;
      }
      if (editing) {
        updateTask(editing, { title: wTitle, courseId: wCourse, estimatedMinutes: wEst });
        showToast(t.add.updated);
        router.back();
        return;
      }
      createWeeklyTask({ title: wTitle, courseId: wCourse, estimatedMinutes: wEst });
      setAdded(t.add.addedWeekly(wTitle.trim(), weeklyCourse.name, fmtLongDay(win.end)));
    } else {
      const input = {
        title: dTitle,
        courseId: dCourse,
        estimatedMinutes: dHours * 60,
        dueAt: dDue < today ? today : dDue,
        dailyBudgetMinutes: dDaily,
        warnDays: dWarn,
      };
      if (editing) {
        updateTask(editing, input);
        showToast(t.add.updated);
        router.back();
        return;
      }
      createDeadlineTask(input);
      setAdded(preview.text);
    }
  };

  const isForm = step !== 'choose';
  const navLeft = () => {
    if (!isForm || editing || params.kind) router.back();
    else setStep('choose');
  };
  const spanIndex = t.add.spans.findIndex(([n]) => addDays(today, n) === dDue);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 4 }}>
        <Grabber />
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, marginTop: 4 }}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Pressable
              accessibilityRole="button"
              onPress={navLeft}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 4 }}
            >
              {isForm && !editing && !params.kind ? <ChevronLeft color={c.ink} /> : null}
              <AppText variant="bodyLarge">{isForm && !editing && !params.kind ? t.common.back : t.common.cancel}</AppText>
            </Pressable>
          </View>
          <AppText variant="headline" numberOfLines={1}>
            {editing ? t.add.editTask : step === 'weekly' ? t.add.weekly : step === 'deadline' ? t.add.deadline : t.add.newTask}
          </AppText>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {isForm ? (
              <Pressable
                accessibilityRole="button"
                onPress={submit}
                hitSlop={8}
                style={{ height: 44, justifyContent: 'center', paddingHorizontal: 4 }}
              >
                <AppText variant="headline" tone={valid ? 'ink' : 'ink3'}>
                  {editing ? t.common.save : t.common.add}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 48 }}
      >
        {step === 'choose' ? (
          <View>
            <AppText variant="sheetTitle" style={{ marginTop: 16, marginBottom: 20 }}>
              {t.add.question}
            </AppText>
            <View style={{ gap: 12 }}>
              {[
                { k: 'weekly' as const, title: t.add.weekly, desc: t.add.weeklyDesc, icon: <RepeatIcon color={c.ink2} /> },
                {
                  k: 'deadline' as const,
                  title: t.add.deadline,
                  desc: t.add.deadlineDesc,
                  icon: <FlagIcon color={c.ink2} size={22} />,
                },
              ].map((o) => (
                <Pressable
                  key={o.k}
                  accessibilityRole="button"
                  onPress={() => setStep(o.k)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    padding: 20,
                    borderRadius: radii.card,
                    borderWidth: 1,
                    borderColor: c.line,
                    backgroundColor: pressed ? c.surface2 : c.surface,
                  })}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: c.surface2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {o.icon}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="headline">{o.title}</AppText>
                    <AppText variant="body" tone="ink2">
                      {o.desc}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 'weekly' ? (
          <View>
            <SectionLabel>{t.add.templates}</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TEMPLATES.map((tpl) => (
                <Chip key={tpl} label={tpl} selected={wTitle === tpl} onPress={() => setWTitle(tpl)} />
              ))}
            </View>
            <View style={{ marginTop: 20 }}>
              <Field value={wTitle} onChange={setWTitle} placeholder={t.add.titlePlaceholder} c={c} />
            </View>

            <SectionLabel>{t.add.course}</SectionLabel>
            {courses.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {courses.map((k) => (
                  <Chip
                    key={k.id}
                    label={`${k.shortName} · ${WEEKDAYS_SHORT[k.weekday - 1]}`}
                    dot={k.color}
                    selected={wCourse === k.id}
                    onPress={() => setWCourse(k.id)}
                  />
                ))}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <AppText variant="body" tone="ink2">
                  {t.add.noCourses}
                </AppText>
                <Button label={t.add.addCourse} kind="secondary" small onPress={() => router.push('/courses/manual')} />
              </View>
            )}

            {win ? (
              <>
                <SectionLabel>{t.add.window}</SectionLabel>
                <View
                  style={{
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.line,
                    borderRadius: radii.input,
                    overflow: 'hidden',
                  }}
                >
                  <Row c={c} label={t.add.windowStart} value={fmtLongDay(win.start)} />
                  <Row
                    c={c}
                    label={t.add.windowEnd}
                    value={fmtLongDay(win.end)}
                    strong
                    icon={<LockIcon color={c.heat[4]} size={13} />}
                  />
                  <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                      {ramp.map((r) => (
                        <View key={r.day} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                          <View style={{ alignSelf: 'stretch', height: 8, borderRadius: 3, backgroundColor: c.heat[r.heat] }} />
                          <AppText variant="micro" tone="ink3" maxFontSizeMultiplier={1.1}>
                            {fmtWeekdayShort(r.day)}
                          </AppText>
                        </View>
                      ))}
                    </View>
                    <AppText variant="footnote" tone="ink2">
                      {t.add.rampNote(Math.max(0, coolDays))}
                    </AppText>
                  </View>
                </View>
              </>
            ) : null}

            <SectionLabel>{t.add.estimate}</SectionLabel>
            <View
              style={{
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: radii.input,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: 52,
                paddingLeft: 16,
                paddingRight: 12,
              }}
            >
              <AppText variant="headline" tabular>
                {t.add.perWeek(fmtMinutes(wEst))}
              </AppText>
              <Stepper onDec={() => setWEst((v) => Math.max(15, v - 15))} onInc={() => setWEst((v) => Math.min(300, v + 15))} />
            </View>
            <AppText variant="footnote" tone="ink2" style={{ paddingTop: 8, paddingHorizontal: 4 }}>
              {t.add.estimateNote}
            </AppText>
          </View>
        ) : null}

        {step === 'deadline' ? (
          <View>
            <View style={{ marginTop: 12 }}>
              <Field value={dTitle} onChange={setDTitle} placeholder={t.add.deadlinePlaceholder} c={c} />
            </View>

            <SectionLabel>{t.add.courseOptional}</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[...new Map(courses.map((k) => [k.shortName, k])).values()].map((k) => (
                <Chip key={k.id} label={k.shortName} dot={k.color} selected={dCourse === k.id} onPress={() => setDCourse(k.id)} />
              ))}
              <Chip label={t.common.none} dot={c.ink3} selected={dCourse == null} onPress={() => setDCourse(null)} />
            </View>

            <SectionLabel>{t.add.due}</SectionLabel>
            <View
              style={{
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: radii.input,
                overflow: 'hidden',
              }}
            >
              <Row
                c={c}
                label={t.add.dueDate}
                value={`${fmtLongDay(dDue)} · ${t.add.dueTime}`}
                onPress={() => setPicker((p) => !p)}
                last={!picker}
              />
              {picker ? (
                <DateTimePicker
                  value={parseLocalDate(dDue)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={parseLocalDate(today)}
                  locale="tr-TR"
                  accentColor={c.ink}
                  onChange={(e, d) => {
                    if (Platform.OS !== 'ios') setPicker(false);
                    if (e.type === 'set' && d) setDDue(toLocalDate(d));
                  }}
                />
              ) : null}
              <View style={{ flexDirection: 'row', gap: 6, padding: 12 }}>
                {t.add.spans.map(([n, label], i) => (
                  <View key={n} style={{ flex: 1 }}>
                    <Chip label={label} small selected={spanIndex === i} onPress={() => setDDue(addDays(today, n))} />
                  </View>
                ))}
              </View>
            </View>

            <SectionLabel>{t.add.tempo}</SectionLabel>
            <View
              style={{
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: radii.input,
                overflow: 'hidden',
              }}
            >
              {[
                {
                  label: t.add.total,
                  value: t.add.hours(dHours),
                  dec: () => setDHours((v) => Math.max(1, v - 1)),
                  inc: () => setDHours((v) => Math.min(80, v + 1)),
                },
                {
                  label: t.add.daily,
                  value: fmtMinutes(dDaily),
                  dec: () => setDDaily((v) => Math.max(15, v - 15)),
                  inc: () => setDDaily((v) => Math.min(240, v + 15)),
                },
                {
                  label: t.add.warn,
                  value: t.add.warnValue(dWarn),
                  dec: () => setDWarn((v) => Math.max(1, v - 1)),
                  inc: () => setDWarn((v) => Math.min(14, v + 1)),
                },
              ].map((r, i, arr) => (
                <View
                  key={r.label}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 56,
                    marginLeft: 16,
                    paddingRight: 12,
                    paddingVertical: 6,
                    borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                    borderBottomColor: c.line,
                  }}
                >
                  <View style={{ flexShrink: 1, gap: 1 }}>
                    <AppText variant="body" tone="ink2">
                      {r.label}
                    </AppText>
                    <AppText variant="headline" tabular>
                      {r.value}
                    </AppText>
                  </View>
                  <Stepper onDec={r.dec} onInc={r.inc} />
                </View>
              ))}
            </View>

            <View
              accessible
              accessibilityLabel={`${t.add.preview(HEAT_NAMES_LOWER[preview.base])}. ${preview.text}`}
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: radii.card,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: preview.base >= 2 ? mix(c.heat[preview.base], c.line, 0.35) : c.line,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.heat[preview.base] }} />
                <AppText variant="label" tone="ink2">
                  {t.add.preview(HEAT_NAMES_LOWER[preview.base])}
                </AppText>
              </View>
              <AppText variant="headline" tabular>
                {preview.text}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 2, height: 8 }}>
                {preview.segs.map((h, i) => (
                  <View key={i} style={{ flex: 1, borderRadius: 2, backgroundColor: c.heat[h] }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="micro" tone="ink3">
                  {t.add.previewToday}
                </AppText>
                <AppText variant="micro" tone="ink3">
                  {t.add.previewWarn(dWarn)}
                </AppText>
                <AppText variant="micro" tone="ink3" tabular>
                  {preview.end}
                </AppText>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <ToastHost bottom={insets.bottom + 24} />
      {added ? (
        <Animated.View
          entering={FadeIn.duration(250)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: c.bg,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            paddingHorizontal: 32,
          }}
        >
          <DoneBadge color={c.ink} fg={c.ink} />
          <AppText variant="title" center>
            {t.add.added}
          </AppText>
          <AppText variant="body" tone="ink2" center tabular>
            {added}
          </AppText>
          <Button label={t.common.ok} onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}
