-- Plugin sign-in (CHG-0039, SHARING-0011). A signed-in plugin's own key: only its SHA-256 is kept, with a name for
-- the website's list and when it was made and last used; it lasts 180 days from its last use.
CREATE TABLE IF NOT EXISTS app_keys (
  id        TEXT PRIMARY KEY,                -- public id (the website's list removes by it)
  key_hash  TEXT NOT NULL UNIQUE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  created   INTEGER NOT NULL,
  last_used INTEGER,
  expires   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS app_keys_user ON app_keys(user_id);
-- Device codes waiting to be approved on the website (RFC 8628's shape): hashes of both codes only; 10 minutes.
CREATE TABLE IF NOT EXISTS device_codes (
  code_hash      TEXT PRIMARY KEY,           -- the device code (the plugin polls with it)
  user_code_hash TEXT NOT NULL UNIQUE,       -- the code the person sees, XXXX-XXXX
  name           TEXT NOT NULL,
  created        INTEGER NOT NULL,
  expires        INTEGER NOT NULL,
  polled         INTEGER NOT NULL DEFAULT 0, -- the last poll (faster than the interval is refused)
  user_id        TEXT,                       -- set when approved
  denied         INTEGER NOT NULL DEFAULT 0
);
