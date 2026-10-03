/**
 * Smoke test: renders every route with a seeded demo semester through the
 * real router, so a crash on any screen fails CI before it reaches TestFlight.
 */
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { getDb } from '../src/db/client';
import { loadAll, setSetting } from '../src/db/repo';
import { seedDemo } from '../src/db/seed';
import { logicalDate } from '../src/domain/dates';
import { refresh } from '../src/services/data';

jest.mock('../src/db/client', () => {
  const { openTestDb } = require('./sqliteTestDb');
  const { migrate } = require('../src/db/migrate');
  let db: ReturnType<typeof openTestDb> | null = null;
  return {
    getDb: () => {
      if (!db) {
        db = openTestDb();
        migrate(db);
      }
      return db;
    },
  };
});

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

jest.setTimeout(30_000);

const today = logicalDate(new Date(), '04:00');

function seeded() {
  seedDemo(getDb(), today);
  refresh();
  return loadAll(getDb());
}

afterEach(() => {
  jest.clearAllTimers();
});

describe('app smoke test', () => {
  test('onboarding shows when not onboarded', async () => {
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Ertele, ama son günü kaçırma.')).toBeTruthy();
    act(() => router.push('/onboarding/calendar'));
    expect(await screen.findByText('Takvime bağlan')).toBeTruthy();
    act(() => router.push('/onboarding/manual'));
    expect(await screen.findByText('Dersi ekle')).toBeTruthy();
    act(() => router.push('/onboarding/templates'));
    expect(await screen.findByText('İlk görevler')).toBeTruthy();
    act(() => router.push('/onboarding/notifications'));
    expect(await screen.findByText('Bildirimlere izin ver')).toBeTruthy();
  });

  test('every screen renders with demo data', async () => {
    const data = seeded();
    const active = data.instances.find((i) => i.status === 'active')!;
    const task = data.tasks.find((t) => t.id === active.taskId)!;

    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Şimdi sırada')).toBeTruthy();
    expect(screen.getByText('Uzun vadeli işler')).toBeTruthy();

    const visit = async (path: string, text: string) => {
      act(() => router.push(path as Parameters<typeof router.push>[0]));
      expect(await screen.findAllByText(text)).not.toHaveLength(0);
    };

    await visit('/calendar', 'Görev pencereleri');
    await visit('/profile', 'Dönem özeti');
    await visit('/add', 'Ne ekliyoruz?');
    fireEvent.press(screen.getByText('Teslim tarihli iş'));
    expect(await screen.findByText(/Önizleme · şu an/)).toBeTruthy();
    await visit('/add?kind=weekly', 'Hazır şablonlar');
    await visit(`/progress/${active.id}`, 'Kaydet');
    await visit(`/lock/${active.id}`, 'Bugün son gün.');
    await visit(`/task/${task.id}`, 'Günlük ilerleme');
    await visit(`/window/${active.id}`, 'Pencere boyunca');
    await visit(`/day/${today}`, 'Dersler');
    await visit('/courses', 'Takvimden ekle');
    await visit('/courses/manual', 'Dersi ekle');
    await visit('/courses/import', 'Dersleri eşle');
    await visit('/settings/calendars', 'Okunan takvimler');
  });

  test('saving progress from the sheet updates the database', async () => {
    const data = seeded();
    const active = data.instances.find((i) => i.status === 'active' && i.progress < 100)!;
    renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Şimdi sırada');
    act(() => router.push(`/progress/${active.id}`));
    fireEvent.press(await screen.findByText('Bitti'));
    fireEvent.press(screen.getByText('Kaydet'));
    const after = loadAll(getDb()).instances.find((i) => i.id === active.id)!;
    expect(after.progress).toBe(100);
    expect(after.status).toBe('done');
  });

  test('calendar month and deadline views render', async () => {
    seeded();
    setSetting(getDb(), 'showWeekend', true);
    refresh();
    renderRouter('./src/app', { initialUrl: '/calendar' });
    await screen.findByText('Görev pencereleri');
    fireEvent.press(screen.getByText('Ay'));
    expect(await screen.findByText('✓ yapılan')).toBeTruthy();
    fireEvent.press(screen.getByText('Teslimler'));
    expect(await screen.findAllByText('günlük pay')).not.toHaveLength(0);
  });

  test('adding a deadline and a weekly task writes to the database', async () => {
    const before = seeded();
    renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Şimdi sırada');

    act(() => router.push('/add'));
    fireEvent.press(await screen.findByText('Teslim tarihli iş'));
    fireEvent.changeText(screen.getByPlaceholderText('Ödev, proje ya da sınav'), 'Final projesi');
    fireEvent.press(screen.getByText('Ekle'));
    expect(await screen.findByText('Ekledim.')).toBeTruthy();
    fireEvent.press(screen.getByText('Tamam'));

    act(() => router.push('/add?kind=weekly'));
    fireEvent.press(await screen.findByText('Soru çöz'));
    fireEvent.press(screen.getByText('Ekle'));
    expect(await screen.findByText('Ekledim.')).toBeTruthy();

    const after = loadAll(getDb());
    expect(after.tasks.length).toBe(before.tasks.length + 2);
    const final = after.tasks.find((t) => t.title === 'Final projesi')!;
    expect(final.kind).toBe('deadline');
    expect(after.instances.some((i) => i.taskId === final.id && i.status === 'active')).toBe(true);
  });

  test('a course on Mon/Wed/Fri at different hours is entered in one go', async () => {
    seeded();
    renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Şimdi sırada');
    act(() => router.push('/courses/manual'));
    fireEvent.changeText(await screen.findByPlaceholderText('Ders adı'), 'Elmak Lab');
    fireEvent.press(screen.getByText('+ Başka bir gün ekle'));
    fireEvent.press(screen.getByText('+ Başka bir gün ekle'));
    expect(screen.getByText('3. gün')).toBeTruthy();
    fireEvent.press(screen.getByText('Dersi ekle'));
    fireEvent.press(await screen.findByText('Bitti'));
    const rows = loadAll(getDb()).courses.filter((k) => k.name === 'Elmak Lab');
    expect(rows.map((k) => k.weekday).sort()).toEqual([1, 3, 5]);
    expect(new Set(rows.map((k) => k.shortName)).size).toBe(1);
  });
});
