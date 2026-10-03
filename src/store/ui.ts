import { create } from 'zustand';

import type { WriteReceipt } from '../db/repo';

/** Ephemeral UI state only. Anything that must survive a restart lives in SQLite. */

export interface ToastState {
  id: number;
  text: string;
  undo: WriteReceipt | null;
}

interface UiState {
  toast: ToastState | null;
  showToast: (text: string, undo?: WriteReceipt | null) => void;
  hideToast: () => void;
  calendarView: 'week' | 'month';
  setCalendarView: (v: 'week' | 'month') => void;
  upcomingExpanded: boolean;
  toggleUpcoming: () => void;
  /** Instance ids animating out of the Today list. */
  leaving: Record<number, true>;
  markLeaving: (id: number, on: boolean) => void;
}

let toastSeq = 0;

export const useUi = create<UiState>((set) => ({
  toast: null,
  showToast: (text, undo = null) => set({ toast: { id: ++toastSeq, text, undo } }),
  hideToast: () => set({ toast: null }),
  calendarView: 'week',
  setCalendarView: (calendarView) => set({ calendarView }),
  upcomingExpanded: false,
  toggleUpcoming: () => set((s) => ({ upcomingExpanded: !s.upcomingExpanded })),
  leaving: {},
  markLeaving: (id, on) =>
    set((s) => {
      const next = { ...s.leaving };
      if (on) next[id] = true;
      else delete next[id];
      return { leaving: next };
    }),
}));

export interface OnboardingCourseDraft {
  key: string;
  name: string;
  shortName: string;
  color: string;
  source: 'calendar' | 'manual';
  calendarEventId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

/** Template preselected for every course during onboarding. */
export const DEFAULT_PICK = ['Ders tekrarı'];

interface OnboardingState {
  courses: OnboardingCourseDraft[];
  picks: Record<string, string[]>;
  calendarIds: string[] | undefined;
  setCourses: (c: OnboardingCourseDraft[]) => void;
  toggleCourse: (key: string) => void;
  addManual: (c: OnboardingCourseDraft) => void;
  removeCourse: (key: string) => void;
  togglePick: (key: string, template: string) => void;
  setCalendarIds: (ids: string[] | undefined) => void;
  reset: () => void;
}

export const useOnboarding = create<OnboardingState>((set) => ({
  courses: [],
  picks: {},
  calendarIds: undefined,
  setCourses: (courses) => set({ courses }),
  toggleCourse: (key) => set((s) => ({ courses: s.courses.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)) })),
  addManual: (c) => set((s) => ({ courses: [...s.courses, c] })),
  removeCourse: (key) => set((s) => ({ courses: s.courses.filter((c) => c.key !== key) })),
  togglePick: (key, template) =>
    set((s) => {
      const cur = s.picks[key] ?? DEFAULT_PICK;
      const next = cur.includes(template) ? cur.filter((x) => x !== template) : [...cur, template];
      return { picks: { ...s.picks, [key]: next } };
    }),
  setCalendarIds: (calendarIds) => set({ calendarIds }),
  reset: () => set({ courses: [], picks: {}, calendarIds: undefined }),
}));
