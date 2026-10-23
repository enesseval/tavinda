/**
 * The date sheet's own month grid (iOS's inline picker left half the sheet empty).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalendarPicker } from '../src/components/CalendarPicker';

test('fills six full weeks, moves between months and respects the limits', () => {
  const onChange = jest.fn();
  render(<CalendarPicker value="2026-11-06" today="2026-10-23" min="2026-10-23" max="2026-12-31" onChange={onChange} />);
  expect(screen.getByText('Kasım 2026')).toBeTruthy();
  // 42 day cells: Mon 26 Oct … Sun 6 Dec.
  expect(screen.getAllByRole('button', { name: /^(Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar), / })).toHaveLength(42);

  fireEvent.press(screen.getByLabelText('Cuma, 13 Kasım'));
  expect(onChange).toHaveBeenLastCalledWith('2026-11-13');

  fireEvent.press(screen.getByLabelText('Önceki ay'));
  expect(screen.getByText('Ekim 2026')).toBeTruthy();
  // Before the minimum: not selectable, and no earlier month.
  fireEvent.press(screen.getByLabelText('Perşembe, 22 Ekim'));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Önceki ay')).toBeDisabled();

  fireEvent.press(screen.getByLabelText('Sonraki ay'));
  fireEvent.press(screen.getByLabelText('Sonraki ay'));
  expect(screen.getByText('Aralık 2026')).toBeTruthy();
  expect(screen.getByLabelText('Sonraki ay')).toBeDisabled();
});
