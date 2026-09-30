// Applied migration: never edit. Add a new numbered file instead.
export const version = 1;

export const up = `
CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('calendar', 'manual')),
  calendar_event_id TEXT,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('weekly', 'deadline')),
  title TEXT NOT NULL,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes >= 0),
  due_at TEXT,
  daily_budget_minutes INTEGER,
  warn_days INTEGER,
  created_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE task_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'missed')),
  defer_count INTEGER NOT NULL DEFAULT 0,
  lock_unlocked_on TEXT,
  UNIQUE (task_id, window_start)
);

CREATE TABLE progress_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id INTEGER NOT NULL REFERENCES task_instances(id) ON DELETE CASCADE,
  logical_date TEXT NOT NULL,
  from_pct INTEGER NOT NULL,
  to_pct INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX idx_instances_task ON task_instances(task_id);
CREATE INDEX idx_instances_status ON task_instances(status, scheduled_date);
CREATE INDEX idx_logs_instance ON progress_logs(instance_id);
CREATE INDEX idx_logs_date ON progress_logs(logical_date);
`;
