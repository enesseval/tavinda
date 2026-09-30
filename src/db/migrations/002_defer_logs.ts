// Applied migration: never edit. Add a new numbered file instead.
// Records each user defer so task detail can show defer history.
export const version = 2;

export const up = `
CREATE TABLE defer_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id INTEGER NOT NULL REFERENCES task_instances(id) ON DELETE CASCADE,
  logical_date TEXT NOT NULL,
  remaining_pct INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_defer_logs_instance ON defer_logs(instance_id);
`;
