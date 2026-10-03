import {
  activeWindow,
  classEndsWithGap,
  currentGap,
  dayTimeline,
  endFromClock,
  endedBlocks,
  planNotifications,
  runningBlock,
  type TimeBlock,
} from '../src/domain';
import { DEFAULT_DAY_HOURS } from '../src/domain/settings';
import { appData, course, settings } from './fixtures';

// 2026-09-30 is a Wednesday; the fixture course meets Wed 13:00–14:50.
const block = (over: Partial<TimeBlock> = {}): TimeBlock => ({
  id: 1,
  startAt: '2026-09-30T15:00:00',
  endAt: '2026-09-30T16:00:00',
  kind: 'meal',
  label: null,
  instanceId: null,
  taskTitle: null,
  fromPct: null,
  toPct: null,
  status: 'running',
  createdAt: '2026-09-30T15:00:00',
  ...over,
});

describe('active hours', () => {
  test('24 hours, same every day, or per weekday; an end before the start runs to midnight', () => {
    expect(activeWindow('2026-09-30', { ...DEFAULT_DAY_HOURS, mode: 'all' })).toEqual({ start: 0, end: 1440 });
    expect(activeWindow('2026-09-30', { ...DEFAULT_DAY_HOURS, mode: 'same', start: '08:00', end: '23:00' })).toEqual({
      start: 480,
      end: 1380,
    });
    const perDay = DEFAULT_DAY_HOURS.perDay.map((p, i) => (i === 2 ? { start: '10:00', end: '02:00' } : p));
    expect(activeWindow('2026-09-30', { ...DEFAULT_DAY_HOURS, mode: 'perDay', perDay })).toEqual({ start: 600, end: 1440 });
  });
});

describe('day timeline and gaps', () => {
  const data = appData({ courses: [course()], blocks: [block()], settings: { ...settings, dayHours: DEFAULT_DAY_HOURS } });

  test('classes, blocks and the gaps between them', () => {
    const tl = dayTimeline(data, '2026-09-30');
    expect(tl.segments.map((s) => [s.kind, s.start, s.end])).toEqual([
      ['gap', 480, 780],
      ['class', 780, 890],
      ['block', 900, 960],
      ['gap', 960, 1380],
    ]);
  });

  test('current gap only in free time inside active hours', () => {
    expect(currentGap(data, new Date(2026, 8, 30, 10, 0))).toEqual({ day: '2026-09-30', start: 480, end: 780 });
    expect(currentGap(data, new Date(2026, 8, 30, 13, 30))).toBeNull(); // in class
    expect(currentGap(data, new Date(2026, 8, 30, 15, 30))).toBeNull(); // in a block
    expect(currentGap(data, new Date(2026, 8, 30, 23, 30))).toBeNull(); // after hours
  });

  test('class endings followed by free time are the moments to ask', () => {
    const noBlock = { ...data, blocks: [] };
    const ends = classEndsWithGap(noBlock, new Date(2026, 8, 30, 9, 0), 1);
    expect(ends.map((e) => e.at.getHours() * 60 + e.at.getMinutes())).toEqual([890]);
    // A block right after class means the user already decided.
    const busy = { ...data, blocks: [block({ startAt: '2026-09-30T14:50:00' })] };
    expect(classEndsWithGap(busy, new Date(2026, 8, 30, 9, 0), 1)).toEqual([]);
  });

  test('running vs ended blocks; end time on the clock rolls past midnight', () => {
    expect(runningBlock([block()], new Date(2026, 8, 30, 15, 30))?.id).toBe(1);
    expect(endedBlocks([block()], new Date(2026, 8, 30, 16, 0)).map((b) => b.id)).toEqual([1]);
    expect(endedBlocks([block({ status: 'done' })], new Date(2026, 8, 30, 17, 0))).toEqual([]);
    expect(endFromClock(new Date(2026, 8, 30, 23, 30), '07:30').getDate()).toBe(1);
    expect(endFromClock(new Date(2026, 8, 30, 12, 0), '13:00').getDate()).toBe(30);
  });
});

describe('block notifications', () => {
  test('a running block gets a "time is up" reminder; class endings into free time ask what is next', () => {
    const now = new Date(2026, 8, 30, 9, 0);
    const data = appData({
      courses: [course()],
      blocks: [block({ startAt: '2026-09-30T08:30:00', endAt: '2026-09-30T10:00:00', kind: 'task', taskTitle: 'Okuma' })],
      settings: { ...settings, dayHours: DEFAULT_DAY_HOURS },
    });
    const plan = planNotifications(data, now, 1);
    const end = plan.find((p) => p.kind === 'blockEnd');
    expect(end).toMatchObject({ blockId: 1, isTask: true });
    expect(end!.fireAt.getHours()).toBe(10);
    const classEnd = plan.filter((p) => p.kind === 'classEnd');
    expect(classEnd.length).toBeGreaterThanOrEqual(1);
    expect(classEnd[0].fireAt.getTime()).toBe(new Date(2026, 8, 30, 14, 50).getTime());
  });
});
