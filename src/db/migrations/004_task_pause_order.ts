// Applied migration: never edit. Add a new numbered file instead.
// - tasks.paused_at: set while the user ignores a task for a while (e.g. exam week)
// - tasks.sort_order: the user's own order on the Görevler tab (null = by heat)
export const version = 4;

export const up = `
ALTER TABLE tasks ADD COLUMN paused_at TEXT;
ALTER TABLE tasks ADD COLUMN sort_order INTEGER;
`;
