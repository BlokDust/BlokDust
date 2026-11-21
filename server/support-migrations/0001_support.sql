-- Dedicated SUPPORT_DB only. No edit credentials, sample audio or public read API.
PRAGMA foreign_keys = ON;
CREATE TABLE support_reports (
  id TEXT PRIMARY KEY,
  created INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('feedback','automatic')),
  message TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL,
  build TEXT NOT NULL,
  surface TEXT NOT NULL CHECK (surface IN ('web','plugin','standalone','unknown')),
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','in_progress','resolved','closed','spam')),
  category TEXT NOT NULL DEFAULT 'unclassified' CHECK (category IN ('unclassified','bug','support','suggestion','other')),
  severity TEXT NOT NULL DEFAULT 'unknown' CHECK (severity IN ('unknown','low','medium','high','critical')),
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 4),
  spam_score REAL CHECK (spam_score BETWEEN 0 AND 1),
  duplicate_of TEXT,
  assigned_to TEXT,
  triaged_at INTEGER,
  review_due INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX support_queue ON support_reports(status, priority DESC, created);
CREATE INDEX support_grouping ON support_reports(fingerprint, version);
CREATE INDEX support_expiry ON support_reports(expires);
CREATE INDEX support_review_due ON support_reports(status, review_due);
CREATE TABLE support_context (
  report_id TEXT PRIMARY KEY REFERENCES support_reports(id) ON DELETE CASCADE,
  system_json TEXT NOT NULL,
  patch_json TEXT NOT NULL,
  diagnostics_json TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX support_context_expiry ON support_context(expires);
-- Future staff actions and AI suggestions are separate from immutable user submissions.
CREATE TABLE support_triage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL REFERENCES support_reports(id) ON DELETE CASCADE,
  created INTEGER NOT NULL,
  actor TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('human','automation')),
  details_json TEXT NOT NULL
);
