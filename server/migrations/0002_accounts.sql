-- SPEC-SHARING-ACCOUNTS (SHARING-0008): optional accounts. No passwords and no email addresses are stored.
CREATE TABLE users (
  id      TEXT PRIMARY KEY,
  -- Chosen by the user (R6); NULL until then (a new Google sign-in picks one next).
  handle  TEXT UNIQUE COLLATE NOCASE,
  created INTEGER NOT NULL
);
-- Passkeys (WebAuthn). `id` is the credential id (base64url); `public_key` the COSE key.
CREATE TABLE credentials (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key BLOB NOT NULL,
  counter    INTEGER NOT NULL DEFAULT 0,
  transports TEXT NOT NULL DEFAULT '',
  created    INTEGER NOT NULL,
  last_used  INTEGER
);
CREATE INDEX credentials_user ON credentials(user_id);
-- Sign-in with another provider (Google): its stable subject id only.
CREATE TABLE identities (
  provider TEXT NOT NULL,
  subject  TEXT NOT NULL,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created  INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE INDEX identities_user ON identities(user_id);
-- Sessions: only the SHA-256 of the cookie's token is kept (R3).
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created    INTEGER NOT NULL,
  expires    INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
-- One-time WebAuthn challenges (5 minutes), found by a random id kept in a cookie.
CREATE TABLE challenges (
  id        TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  kind      TEXT NOT NULL,
  data      TEXT NOT NULL DEFAULT '',
  expires   INTEGER NOT NULL
);
-- A patch can belong to an account (R9); anonymous patches keep NULL.
ALTER TABLE patches ADD COLUMN owner_id TEXT REFERENCES users(id);
CREATE INDEX patches_owner ON patches(owner_id, updated);
