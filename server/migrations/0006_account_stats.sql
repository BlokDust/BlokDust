-- SPEC-SHARING-ACCOUNTS R15 (CHG-0027): the block types a patch's latest revision uses and how many of each
-- ("source.tone:3 power.laser:1"), written on every save, so the account's favourite blocks never need the patch JSON.
ALTER TABLE patches ADD COLUMN blocks TEXT NOT NULL DEFAULT '';
