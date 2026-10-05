import type { TimeBlock } from '../src/domain';
import { liveBlock } from '../src/services/liveActivity';
import { widgetPayload } from '../src/services/widget';
import { appData, course, deadlineTask, instance, settings, weeklyTask } from './fixtures';

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

describe('widget payload', () => {
  const data = appData({
    courses: [course()],
    tasks: [weeklyTask(), deadlineTask({ dueAt: '2026-10-02', dueTime: '17:00' })],
    instances: [
      instance({ progress: 40 }),
      instance({ id: 200, taskId: 20, windowStart: '2026-09-28', windowEnd: '2026-10-02', progress: 20 }),
    ],
    blocks: [block()],
  });

  test('integers only, due moment and running block on the real clock', () => {
    const p = widgetPayload(data, new Date(2026, 8, 30, 15, 10));
    expect(p.version).toBe(2);
    expect(p.hottest?.instanceId).toBe(200);
    expect(p.hottest?.dueAtMs).toBe(new Date(2026, 9, 2, 17, 0).getTime());
    expect(p.block).toMatchObject({ name: 'Yemek', kind: 'meal', endMs: new Date(2026, 8, 30, 16, 0).getTime() });
    for (const t of [p.hottest!, ...p.top]) {
      expect(Number.isInteger(t.percent) && Number.isInteger(t.remainingMinutes) && Number.isInteger(t.shareMinutes)).toBe(true);
    }
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });

  test('debug time travel is removed so the widget counts down in real time', () => {
    const day = 86_400_000;
    const travelled = { ...data, settings: { ...settings, timeOffsetMs: day } };
    const p = widgetPayload(travelled, new Date(2026, 8, 30, 15, 10));
    expect(p.hottest?.dueAtMs).toBe(new Date(2026, 9, 2, 17, 0).getTime() - day);
  });
});

describe('live activity block', () => {
  test('shows the latest open block; none when all are done', () => {
    expect(liveBlock([block(), block({ id: 2, startAt: '2026-09-30T16:00:00' })])?.id).toBe(2);
    expect(liveBlock([block({ status: 'done' })])).toBeNull();
  });
});
