-- Owner review 1 of the gallery (2026-11-15, SPEC-SHARING-GALLERY R14): roughly how many times each patch was opened
-- in the app.
ALTER TABLE patches ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
