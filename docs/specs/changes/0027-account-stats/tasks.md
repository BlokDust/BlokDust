# CHG-0027 tasks: Account stats

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Migration 0006 (`patches.blocks`), tally on create and save, lazy count of older patches
- [x] 2. `GET /api/me?stats=1`: patches, remixes, remixed, most remixed, likes, opens, favourite blocks (R15)
- [x] 3. Settings › ACCOUNT draws the stats with v1 pieces (R15); screenshots desktop + phone
- [x] 4. `pnpm test:accounts` `stats` checks
- [x] 5. Phase B: migration 0007, estimates in the page, credited on save and on page close, ACTIVITY_BEACON switch (R16)
- [x] 5a. `pnpm test:accounts` `activity` checks; layout: second number row, DELETE ACCOUNT on the SIGNED IN line
- [ ] 6. Staging: migrations applied, owner check
      2026-11-20 owner: mostly good. Favourites come from the latest revision of each saved patch (the owner's 8 on
      staging: Power, Tone, Toggle, Emitter, Void, Random Note; no saved patch has a Stage); six now in one row on a
      computer. Likes/remixes 0 checked in D1 (no likes yet; the one SAVE AS was of their own patch). Owner to confirm.
