// Applied migration: never edit. Add a new numbered file instead.
// - tasks.due_offset: weekly tasks are due this many days after the class (0–6, null = 6)
// - tasks.start_on: weekly tasks open no window that ended before this date
//   (a later first week, and resuming after a pause)
// tasks.due_time now also applies to weekly tasks (the hour on the last day).
export const version = 5;

export const up = `
ALTER TABLE tasks ADD COLUMN due_offset INTEGER;
ALTER TABLE tasks ADD COLUMN start_on TEXT;
`;
