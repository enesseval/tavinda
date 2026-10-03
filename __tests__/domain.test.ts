import {
  addDays,
  applyDefer,
  applyProgress,
  applyReconcile,
  countdownParts,
  dueInstant,
  buildTodayModel,
  canDefer,
  deadlineHeat,
  diffDays,
  getWidgetSnapshot,
  heatFor,
  isOverdue,
  isReconcileNoop,
  logicalDate,
  parseLocalDate,
  planNotifications,
  reconcile,
  shareForInstance,
  snapProgress,
  suggestedDailyShare,
  taskListModel,
  weeklyBaseHeat,
  weeklyHeat,
  weeklyWindow,
  currentWeeklyWindow,
  windowRows,
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

  test('4. logical 2026-10-07 with 80% → stays open as overdue, new window 2026-10-07..2026-10-13', () => {
    const old = instance({ progress: 80, scheduledDate: '2026-10-06' });
    const r = reconcile({ today: '2026-10-07', courses: [course()], tasks: [weeklyTask()], instances: [old] });
    expect(r.update).toEqual([{ id: 100, changes: { scheduledDate: '2026-10-07' } }]);
    expect(r.create).toHaveLength(1);
    expect(r.create[0]).toMatchObject({ windowStart: '2026-10-07', windowEnd: '2026-10-13', scheduledDate: '2026-10-07' });
    expect(isOverdue(old, '2026-10-07')).toBe(true);
    expect(canDefer(old, '2026-10-07', { lockMode: 'flexible' })).toBe(false);
  });

  test('4b. overdue work closes as missed after OVERDUE_DAYS', () => {
    const old = instance({ progress: 80, scheduledDate: '2026-10-13' });
    expect(reconcile({ today: '2026-10-13', courses: [course()], tasks: [weeklyTask()], instances: [old] }).update).toEqual([]);
    const r = reconcile({ today: '2026-10-14', courses: [course()], tasks: [weeklyTask()], instances: [old] });
    expect(r.update).toEqual([{ id: 100, changes: { status: 'missed' } }]);
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
  test('weekly ramp: 3 cool days, then ılık, sıcak, kızgın, son gün', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((d) => weeklyBaseHeat(d, 7))).toEqual([0, 0, 0, 1, 2, 3, 4]);
  });

  test('weekly heat: cool days stay serin; +1 after them when more than half remains (max 3)', () => {
    // Window Wed 30 Sep … Tue 6 Oct.
    expect(weeklyHeat(instance({ progress: 0 }), '2026-09-30')).toBe(0);
    expect(weeklyHeat(instance({ progress: 0 }), '2026-10-02')).toBe(0);
    expect(weeklyHeat(instance({ progress: 0 }), '2026-10-03')).toBe(2);
    expect(weeklyHeat(instance({ progress: 60 }), '2026-10-03')).toBe(1);
    expect(weeklyHeat(instance({ progress: 0 }), '2026-10-05')).toBe(3);
    expect(weeklyHeat(instance({ progress: 60 }), '2026-10-05')).toBe(3);
    expect(weeklyHeat(instance({ progress: 60 }), '2026-10-07')).toBe(4);
  });

  test('daily share: small work in one sitting, otherwise ≥30 min in 15-min steps, one day early', () => {
    expect(suggestedDailyShare(15, 3)).toBe(15);
    expect(suggestedDailyShare(45, 7)).toBe(45);
    expect(suggestedDailyShare(600, 61)).toBe(30);
    expect(suggestedDailyShare(90, 4)).toBe(30);
    expect(suggestedDailyShare(240, 3)).toBe(120);
    expect(suggestedDailyShare(50, 1)).toBe(50);
    expect(suggestedDailyShare(0, 5)).toBe(0);
  });

  test("work logged today counts against today's share", () => {
    // 120 min task, window ends in 3 days; 75 min done today (progress 62%).
    const task = weeklyTask({ estimatedMinutes: 120 });
    const inst = instance({ progress: 62, windowEnd: '2026-10-02' });
    expect(shareForInstance(instance({ windowEnd: '2026-10-02' }), task, '2026-09-30')).toBe(60);
    expect(shareForInstance(inst, task, '2026-09-30', 75)).toBe(0);
    expect(shareForInstance(instance({ progress: 25, windowEnd: '2026-10-02' }), task, '2026-09-30', 30)).toBe(30);
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

describe('week window rows', () => {
  test('one row per task; the next weekly window starts cool right after the last day', () => {
    const data = appData({ courses: [course()], tasks: [weeklyTask()], instances: [instance({ progress: 20 })] });
    const days = Array.from({ length: 7 }, (_, i) => addDays('2026-10-05', i));
    const rows = windowRows(data, '2026-10-05', days);
    expect(rows).toHaveLength(1);
    const [cur, next] = rows[0].segments;
    expect(cur).toMatchObject({ fromCol: 0, toCol: 1, clippedLeft: true, heats: [3, 4], projected: false });
    expect(next).toMatchObject({ fromCol: 2, toCol: 6, clippedRight: true, heats: [0, 0, 0, 1, 2], projected: true });
  });
});

describe('countdown and deadline reminders', () => {
  test('due instant: deadline hour or 23:59 for weekly; countdown parts', () => {
    const due = dueInstant({ windowEnd: '2026-10-04' }, { kind: 'deadline', dueTime: '17:00' });
    expect(due.getHours()).toBe(17);
    expect(dueInstant({ windowEnd: '2026-10-04' }, { kind: 'weekly', dueTime: '09:00' }).getMinutes()).toBe(59);
    expect(countdownParts(new Date(2026, 9, 2, 1, 9), new Date(2026, 9, 4, 17, 0))).toEqual({
      days: 2,
      hours: 15,
      minutes: 51,
      past: false,
    });
    expect(countdownParts(new Date(2026, 9, 5), due).past).toBe(true);
  });

  test('warn day brings a "start now" reminder; the last-minutes alarm is opt-in', () => {
    const task = deadlineTask({ dueAt: '2026-10-20', warnDays: 3, dueTime: '17:00', alarmMinutes: 10 });
    const inst = instance({ id: 200, taskId: 20, windowStart: '2026-09-30', windowEnd: '2026-10-20' });
    const now = new Date(2026, 8, 30, 12, 0);
    const plan = planNotifications(appData({ tasks: [task], instances: [inst] }), now, 1);
    const start = plan.find((p) => p.kind === 'startNow');
    expect(start?.day).toBe('2026-10-17');
    const alarm = plan.find((p) => p.kind === 'lastMinutes');
    expect(alarm?.fireAt.getTime()).toBe(new Date(2026, 9, 20, 16, 50).getTime());
    const off = planNotifications(appData({ tasks: [{ ...task, alarmMinutes: null }], instances: [inst] }), now, 1);
    expect(off.some((p) => p.kind === 'lastMinutes')).toBe(false);
  });
});

describe('task list (Görevler tab)', () => {
  test('active work hottest first with risk counts; weekly tasks listed once as recurring', () => {
    const data = appData({
      courses: [course()],
      tasks: [
        weeklyTask(),
        deadlineTask({ dueAt: '2026-10-02' }),
        deadlineTask({ id: 21, title: 'Uzak iş', dueAt: '2026-12-20' }),
      ],
      instances: [
        instance({ progress: 40, windowStart: '2026-09-23', windowEnd: '2026-09-29', status: 'done' }),
        instance({ id: 101, progress: 0 }),
        instance({ id: 200, taskId: 20, windowStart: '2026-09-28', windowEnd: '2026-10-02', progress: 20 }),
        instance({ id: 201, taskId: 21, windowStart: '2026-09-28', windowEnd: '2026-12-20' }),
      ],
    });
    const m = taskListModel(data, '2026-10-02');
    expect(m.active.map((i) => i.instance.id)).toEqual([200, 101, 201]);
    expect(m.risk).toEqual({ watch: 0, risky: 0, critical: 1 });
    expect(m.recurring.map((i) => i.instance.id)).toEqual([101]);
    expect(m.done.map((i) => i.instance.id)).toEqual([100]);
  });
});
