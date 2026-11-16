-- Owner review 3 (2026-11-16, SPEC-SHARING-GALLERY R16): the @blokdust account's patches are the gallery's EXAMPLES and
-- TUTORIALS (the built-in presets moved there from OPEN). '' for everyone else's.
ALTER TABLE gallery ADD COLUMN kind TEXT NOT NULL DEFAULT '';
CREATE INDEX gallery_kind ON gallery(kind, hidden, published);
