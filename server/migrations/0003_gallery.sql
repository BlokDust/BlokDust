-- SPEC-SHARING-GALLERY (SHARING-0009): published patches, likes (no down votes) and reports.
CREATE TABLE gallery (
  patch_id  TEXT PRIMARY KEY REFERENCES patches(id),
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  -- The block types the patch uses, space separated (searchable: "laser", "granular").
  blocks    TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL,
  likes     INTEGER NOT NULL DEFAULT 0,
  reports   INTEGER NOT NULL DEFAULT 0,
  -- Hidden after enough reports (R9) or by the owner of the site (bd gallery hide).
  hidden    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX gallery_new ON gallery(hidden, published);
CREATE INDEX gallery_user ON gallery(user_id, published);
CREATE TABLE likes (
  patch_id TEXT NOT NULL REFERENCES gallery(patch_id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created  INTEGER NOT NULL,
  PRIMARY KEY (patch_id, user_id)
);
CREATE INDEX likes_user ON likes(user_id);
CREATE TABLE reports (
  patch_id TEXT NOT NULL REFERENCES gallery(patch_id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason   TEXT NOT NULL DEFAULT '',
  created  INTEGER NOT NULL,
  PRIMARY KEY (patch_id, user_id)
);
