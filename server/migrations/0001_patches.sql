-- SPEC-SHARING-BACKEND R2: one row per share id, one per saved revision. A link opens the latest revision (v1 Save
-- overwrote; every save is kept). Edit tokens are stored only as SHA-256 hashes.
CREATE TABLE patches (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL DEFAULT '',
  parent    TEXT,
  edit_hash TEXT NOT NULL,
  rev       INTEGER NOT NULL,
  created   INTEGER NOT NULL,
  updated   INTEGER NOT NULL,
  deleted   INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE revisions (
  patch_id TEXT NOT NULL,
  rev      INTEGER NOT NULL,
  json     TEXT NOT NULL,
  title    TEXT NOT NULL DEFAULT '',
  thumb    BLOB,
  created  INTEGER NOT NULL,
  PRIMARY KEY (patch_id, rev)
);
CREATE INDEX patches_parent ON patches(parent);
