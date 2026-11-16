-- SPEC-SHARING-ACCOUNTS R16 (CHG-0027): running totals for fun, estimated in the browser and added on save or when the
-- page is closed. Not exact and not checked: only their owner sees them.
ALTER TABLE users ADD COLUMN play_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN blocks_added INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN particles INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN laser_turns REAL NOT NULL DEFAULT 0;
