// Applied migration: never edit. Add a new numbered file instead.
// - tasks.due_time: deadline hour ('HH:mm', null = 23:59)
// - tasks.alarm_minutes: optional "last minutes" alarm before the deadline
// - time_blocks: what the user did with each stretch of the day
// - course colors move to a more distinct palette (same order)
export const version = 3;

export const up = `
ALTER TABLE tasks ADD COLUMN due_time TEXT;
ALTER TABLE tasks ADD COLUMN alarm_minutes INTEGER;

CREATE TABLE time_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('sleep', 'meal', 'rest', 'other', 'task')),
  label TEXT,
  instance_id INTEGER REFERENCES task_instances(id) ON DELETE SET NULL,
  task_title TEXT,
  from_pct INTEGER,
  to_pct INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done')),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_blocks_start ON time_blocks(start_at);

UPDATE courses SET color = CASE color
  WHEN '#93A3BC' THEN '#4F8AE8'
  WHEN '#B4A2CC' THEN '#9A6AE0'
  WHEN '#C9A898' THEN '#E06AAE'
  WHEN '#B7AE8A' THEN '#3FA7C9'
  WHEN '#A3B3AD' THEN '#8E9B3D'
  WHEN '#9FB0A0' THEN '#B57A4A'
  WHEN '#B99FA8' THEN '#6570D8'
  WHEN '#A8A0C0' THEN '#C05BD0'
  ELSE color END;
`;
