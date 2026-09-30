import {
  addDays,
  applyDefer,
  applyProgress,
  applyReconcile,
  buildTodayModel,
  canDefer,
  deadlineHeat,
  diffDays,
  getWidgetSnapshot,
  heatFor,
  isReconcileNoop,
  logicalDate,
  parseLocalDate,
  planNotifications,
  reconcile,
  snapProgress,
  suggestedDailyShare,
  weeklyBaseHeat,
  weeklyHeat,
  weeklyWindow,
  currentWeeklyWindow,
  type TaskInstance,
} from '../src/domain';
import { appData, course, deadlineTask, instance, settings, weeklyTask } from './fixtures';

describe('required domain tests', () => {
  test('1. Wednesday class opens window 2026-09-30..2026-10-06', () => {
    expect(weeklyWindow('2026-09-30')).toEqual({ start: '2026-09-30', end: '2026-10-06' });
    expect(currentWeeklyWindow('2026-09-30', 3)).toEqual({ start: '2026-09-30', end: '2026-10-06' });

    const r = reconcile({ today: '2026-09-30', courses: [course()], tasks: [weeklyTask()], instances: [] });
    expect(r.create).toHaveLength(1);
    expect(r.create[0]).toMatchObject({ windowStart: '2026-09-30', windowEnd: '2026-10-06', status: 'active', progress: 0 });
  });

  test('2. 40% on Wednesday then defer → scheduled Thursday, 60% left, defer_count 1', () => {
    const wed = '2026-09-30';
    const saved = applyProgress(instance(), 40, wed);
    expect(saved.log).toEqual({ instanceId: 100, logicalDate: wed, fromPct: 0, toPct: 40 });
    const deferred = applyDefer(saved.instance, wed, settings);
    expect(deferred).not.toBeNull();
    expect(deferred!.instance.scheduledDate).toBe('2026-10-01');
    expect(deferred!.remainingPct).toBe(60);
    expect(100 - deferred!.instance.progress).toBe(60);
    expect(deferred!.instance.deferCount).toBe(1);
  });

  test('3. Tuesday 2026-10-06: canDefer false (strict) and heat 4', () => {
    const inst = instance({ progress: 40 });
    expect(canDefer(inst, '2026-10-06', { lockMode: 'strict' })).toBe(false);
    expect(applyDefer(inst, '2026-10-06', { lockMode: 'strict' })).toBeNull();
    expect(weeklyHeat(inst, '2026-10-06')).toBe(4);
    expect(canDefer(inst, '2026-10-05', { lockMode: 'strict' })).toBe(true);
  });

  test('4. logical 2026-10-07 with 80% → missed, new window 2026-10-07..2026-10-13', () => {
    const old = instance({ progress: 80, scheduledDate: '2026-10-06' });
    const r = reconcile({ today: '2026-10-07', courses: [course()], tasks: [weeklyTask()], instances: [old] });
    expect(r.update).toEqual([{ id: 100, changes: { status: 'missed' } }]);
    expect(r.create).toHaveLength(1);
    expect(r.create[0]).toMatchObject({ windowStart: '2026-10-07', windowEnd: '2026-10-13', scheduledDate: '2026-10-07' });
  });

  test('5. save at 2026-10-07 02:30 with cutoff 04:00 counts for 2026-10-06', () => {
    const at = new Date(2026, 9, 7, 2, 30);
    expect(logicalDate(at, '04:00')).toBe('2026-10-06');
    expect(logicalDate(new Date(2026, 9, 7, 4, 0), '04:00')).toBe('2026-10-07');
    const { log } = applyProgress(instance(), 50, logicalDate(at, '04:00'));
    expect(log?.logicalDate).toBe('2026-10-06');
  });

  test('6. deadline 600 min due 2026-11-29 budget 45: heat 0 → ≥2 near warn → 4 on due day', () => {
    const task = deadlineTask();
    const inst = instance({ id: 200, taskId: 20, windowStart: '2026-09-30', windowEnd: '2026-11-29' });
    expect(deadlineHeat(inst, task, '2026-09-30', settings)).toBe(0);
    expect(deadlineHeat(inst, task, '2026-11-25', settings)).toBeGreaterThanOrEqual(2);
    expect(deadlineHeat(inst, task, '2026-11-29', settings)).toBe(4);
  });

  test('7. reconcile is idempotent', () => {
    const courses = [course(), course({ id: 2, weekday: 1, name: 'Fizik II', shortName: 'FİZ' })];
    const tasks = [
      weeklyTask(),
      weeklyTask({ id: 11, courseId: 2, title: 'Doküman düzenle' }),
      deadlineTask(),
      deadlineTask({ id: 21, dueAt: '2026-09-01', createdAt: '2026-08-01T09:00:00' }),
    ];
    const stale: TaskInstance[] = [
      instance({ id: 1, progress: 30, scheduledDate: '2026-09-25', windowStart: '2026-09-23', windowEnd: '2026-09-29' }),
      instance({
        id: 2,
        taskId: 11,
        windowStart: '2026-09-28',
        windowEnd: '2026-10-04',
        scheduledDate: '2026-09-28',
        progress: 20,
      }),
    ];
    let id = 1000;
    for (const today of ['2026-09-30', '2026-10-07', '2026-10-20']) {
      let instances = stale;
      const first = reconcile({ today, courses, tasks, instances });
      instances = applyReconcile(instances, first, () => id++);
      const second = reconcile({ today, courses, tasks, instances });
      expect(isReconcileNoop(second)).toBe(true);
    }
  });
});

describe('dates', () => {
  test('LocalDate math is timezone-safe and never uses string Date parsing', () => {
    expect(parseLocalDate('2026-10-25').getDate()).toBe(25);
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(diffDays('2026-11-29', '2026-09-30')).toBe(60);
  });
});

describe('heat', () => {
  test('weekly base ramp matches the design (serin ×3, ılık ×2, sıcak, son gün)', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((d) => weeklyBaseHeat(d, 7))).toEqual([0, 0, 0, 1, 1, 2, 4]);
  });

  test('weekly heat +1 when more than half remains (max 3)', () => {
    expect(weeklyHeat(instance({ progress: 0 }), '2026-09-30')).toBe(1);
    expect(weeklyHeat(instance({ progress: 60 }), '2026-09-30')).toBe(0);
    expect(weeklyHeat(instance({ progress: 0 }), '2026-10-05')).toBe(3);
    expect(weeklyHeat(instance({ progress: 60 }), '2026-10-05')).toBe(2);
  });

  test('suggested share aims one day early, rounded up to 5 minutes', () => {
    expect(suggestedDailyShare(600, 61)).toBe(10);
    expect(suggestedDailyShare(90, 4)).toBe(30);
    expect(suggestedDailyShare(35, 1)).toBe(35);
    expect(suggestedDailyShare(0, 5)).toBe(0);
  });

  test('heatFor dispatches by kind', () => {
    const inst = instance({ id: 200, taskId: 20, windowEnd: '2026-11-29' });
    expect(heatFor(inst, deadlineTask(), '2026-11-29', settings)).toBe(4);
    expect(heatFor(instance(), weeklyTask(), '2026-10-06', settings)).toBe(4);
  });
});

describe('defer and progress', () => {
  test('flexible mode unlocks the last day once and stretches the window', () => {
    const inst = instance({ progress: 40 });
    const flex = { lockMode: 'flexible' as const };
    expect(canDefer(inst, '2026-10-06', flex)).toBe(true);
    const r = applyDefer(inst, '2026-10-06', flex)!;
    expect(r.instance).toMatchObject({ scheduledDate: '2026-10-07', windowEnd: '2026-10-07', lockUnlockedOn: '2026-10-06' });
    expect(canDefer({ ...r.instance, windowEnd: '2026-10-06' }, '2026-10-06', flex)).toBe(false);
  });

  test('progress snaps to 10 and reaching 100 marks done', () => {
    expect(snapProgress(44)).toBe(40);
    expect(snapProgress(46)).toBe(50);
    const done = applyProgress(instance({ progress: 60 }), 100, '2026-09-30');
    expect(done.instance.status).toBe('done');
    const reopened = applyProgress(done.instance, 90, '2026-09-30');
    expect(reopened.instance.status).toBe('active');
    expect(applyProgress(instance({ progress: 30 }), 30, '2026-09-30').log).toBeNull();
  });
});

describe('today model, widget and notifications', () => {
  const data = appData({
    courses: [course()],
    tasks: [weeklyTask(), deadlineTask({ dueAt: '2026-10-02' })],
    instances: [
      instance({ progress: 40 }),
      instance({ id: 200, taskId: 20, windowStart: '2026-09-28', windowEnd: '2026-10-02', progress: 20 }),
    ],
  });

  test('hottest task becomes the hero and load sums shares', () => {
    const m = buildTodayModel(data, '2026-09-30');
    expect(m.hero?.task.id).toBe(20);
    expect(m.loadMinutes).toBeGreaterThan(0);
    expect(m.classes.map((c) => c.id)).toEqual([1]);
  });

  test('widget snapshot is plain JSON', () => {
    const snap = getWidgetSnapshot(new Date(2026, 8, 30, 12, 10), data);
    expect(snap.logicalDate).toBe('2026-09-30');
    expect(snap.hottest?.instanceId).toBe(200);
    expect(snap.top.length).toBeLessThanOrEqual(3);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
  });

  test('notifications: morning summaries and last-day reminders', () => {
    const plan = planNotifications(data, new Date(2026, 8, 30, 12, 10));
    expect(plan.some((p) => p.kind === 'morning' && p.day === '2026-10-01')).toBe(true);
    expect(plan.some((p) => p.kind === 'lastDayEvening' && p.day === '2026-10-02' && p.instanceId === 200)).toBe(true);
    expect(plan.some((p) => p.kind === 'lastDayMorning' && p.day === '2026-10-06')).toBe(true);
    expect(plan.every((p) => p.fireAt.getTime() > new Date(2026, 8, 30, 12, 10).getTime())).toBe(true);
  });
});
