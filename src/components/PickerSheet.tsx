import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseLocalDate, toLocalDate } from '../domain/dates';
import { t } from '../i18n/tr';
import { useNow } from '../services/clock';
import { useTheme } from '../theme/theme';
import { radii } from '../theme/tokens';
import { AppText } from './AppText';
import { CalendarPicker } from './CalendarPicker';
import { Button, Grabber } from './controls';
import { Touchable } from './Touchable';

/**
 * Date or time picker in a bottom sheet, the way iOS presents pickers: the form
 * underneath never moves, and only one picker can be open at a time.
 * The value is committed with "Tamam"; dismissing keeps the old value.
 */
export function PickerSheet({
  visible,
  mode,
  title,
  value,
  minimumDate,
  maximumDate,
  minuteInterval = 5,
  onCancel,
  onDone,
}: {
  visible: boolean;
  mode: 'date' | 'time';
  title: string;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  onCancel: () => void;
  onDone: (d: Date) => void;
}) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { today } = useNow();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
    // Only reset when the sheet opens, not while the user is scrolling the wheel.
  }, [visible]);

  if (Platform.OS !== 'ios') {
    // Android shows its own dialog.
    return visible ? (
      <DateTimePicker
        value={value}
        mode={mode}
        is24Hour
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        minuteInterval={minuteInterval}
        onChange={(e, d) => {
          if (e.type === 'set' && d) onDone(d);
          else onCancel();
        }}
      />
    ) : null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t.a11y.close}
          onPress={onCancel}
          style={{ position: 'absolute', inset: 0, backgroundColor: c.scrim }}
        />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: radii.sheet,
            borderTopRightRadius: radii.sheet,
            paddingTop: 8,
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            gap: 8,
          }}
        >
          <Grabber />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
            <Touchable accessibilityRole="button" onPress={onCancel} hitSlop={8}>
              <AppText variant="bodyLarge" tone="ink2">
                {t.common.cancel}
              </AppText>
            </Touchable>
            <AppText variant="headline">{title}</AppText>
            <Touchable accessibilityRole="button" onPress={() => onDone(draft)} hitSlop={8}>
              <AppText variant="headline">{t.common.ok}</AppText>
            </Touchable>
          </View>
          {mode === 'date' ? (
            <CalendarPicker
              value={toLocalDate(draft)}
              today={today}
              min={minimumDate ? toLocalDate(minimumDate) : undefined}
              max={maximumDate ? toLocalDate(maximumDate) : undefined}
              onChange={(day) => {
                // Keep the time of day; only the date changes here.
                const next = parseLocalDate(day);
                next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
                setDraft(next);
              }}
            />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                is24Hour
                locale="tr-TR"
                themeVariant={scheme}
                accentColor={c.ink}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                minuteInterval={minuteInterval}
                onChange={(_e, d) => {
                  if (d) setDraft(d);
                }}
              />
            </View>
          )}
          <Button label={t.common.ok} onPress={() => onDone(draft)} />
        </View>
      </View>
    </Modal>
  );
}

/** A field that shows a value and opens a PickerSheet when tapped. */
export function PickerField({
  label,
  value,
  onPress,
  active,
}: {
  label: string;
  value: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 48,
        borderRadius: radii.input,
        borderWidth: 1,
        borderColor: active ? c.ink : c.line,
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
    </Touchable>
  );
}
