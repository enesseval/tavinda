import { addDays, isoWeekday, reconcile } from '../domain';
import type { LocalDate, TaskInstance } from '../domain/types';
import { COURSE_PALETTE } from '../theme/palette';
import {
  applyReconcileResult,
  insertCourse,
  insertTask,
  loadAll,
  saveDeferTx,
  saveProgressTx,
  setSetting,
  wipeAll,
} from './repo';
import type { Db } from './types';

const DEMO_COURSES = [
  { name: 'Lineer Cebir', shortName: 'MAT', weekday: 2, startTime: '09:00', endTime: '10:50' },
  { name: 'Algoritmalar', shortName: 'ALG', weekday: 3, startTime: '13:00', endTime: '14:50' },
  { name: 'Fizik II', shortName: 'FİZ', weekday: 3, startTime: '15:00', endTime: '16:20' },
  { name: 'İstatistik', shortName: 'İST', weekday: 1, startTime: '10:00', endTime: '11:50' },
  { name: 'Tarih', shortName: 'TAR', weekday: 5, startTime: '11:00', endTime: '12:30' },
];

/**
 * Replaces all data with a believable semester around `today`, including
 * past progress so stats, history and heat have something to show.
 */
export function seedDemo(db: Db, today: LocalDate): void {
  wipeAll(db);
  setSetting(db, 'onboarded', true);
  const past = (n: number) => `${addDays(today, -n)}T09:00:00`;

  const courseIds = DEMO_COURSES.map((c, i) =>
    insertCourse(db, { ...c, color: COURSE_PALETTE[i % COURSE_PALETTE.length], source: 'manual', calendarEventId: null }),
  );
  const [mat, alg, fiz, ist, tar] = courseIds;

  const weekly = [
    { title: 'Doküman düzenle', courseId: mat, est: 40 },
    { title: 'Ders tekrarı', courseId: fiz, est: 60 },
    { title: 'Soru çöz', courseId: ist, est: 45 },
    { title: 'Ders tekrarı', courseId: alg, est: 45 },
    { title: 'Okuma', courseId: tar, est: 30 },
  ];
  for (const w of weekly) {
    insertTask(db, {
      kind: 'weekly',
      title: w.title,
      courseId: w.courseId,
      estimatedMinutes: w.est,
      dueAt: null,
      dailyBudgetMinutes: null,
      warnDays: null,
      createdAt: past(21),
    });
  }

  const deadlines = [
    { title: 'Algoritma ödevi 3', courseId: alg, minutes: 140, due: addDays(today, 2), start: 6 },
    { title: 'Staj başvuru dosyası', courseId: null, minutes: 300, due: addDays(today, 24), start: 10 },
    { title: 'Proje raporu', courseId: ist, minutes: 600, due: addDays(today, 58), start: 3 },
    { title: 'Dönem sonu sunumu', courseId: alg, minutes: 480, due: addDays(today, 71), start: 1 },
  ];
  for (const d of deadlines) {
    insertTask(db, {
      kind: 'deadline',
      title: d.title,
      courseId: d.courseId,
      estimatedMinutes: d.minutes,
      dueAt: d.due,
      dailyBudgetMinutes: 45,
      warnDays: 5,
      createdAt: past(d.start),
    });
  }

  // Walk the last three weeks day by day so windows open, carry and close naturally.
  for (let back = 21; back >= 0; back--) {
    const day = addDays(today, -back);
    const data = loadAll(db);
    const tasks = data.tasks.filter((t) => t.createdAt.slice(0, 10) <= day);
    applyReconcileResult(db, reconcile({ today: day, courses: data.courses, tasks, instances: data.instances }));
    if (back === 0) break;
    const fresh = loadAll(db).instances;
    const active = fresh.filter((i) => i.status === 'active' && i.scheduledDate <= day);
    const seedN = back * 7 + isoWeekday(day);
    active.forEach((inst: TaskInstance, k: number) => {
      const roll = (seedN + k * 13) % 10;
      if (roll < 4) {
        const to = Math.min(100, inst.progress + (roll < 2 ? 30 : 20));
        saveProgressTx(
          db,
          inst,
          { ...inst, progress: to, status: to >= 100 ? 'done' : 'active' },
          {
            logicalDate: day,
            fromPct: inst.progress,
            toPct: to,
          },
          `${day}T18:00:00`,
        );
      } else if (roll === 7 && day < inst.windowEnd) {
        saveDeferTx(
          db,
          inst,
          { ...inst, scheduledDate: addDays(day, 1), deferCount: inst.deferCount + 1 },
          day,
          100 - inst.progress,
          `${day}T21:00:00`,
        );
      }
    });
  }
}
