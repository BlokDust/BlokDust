---
id: CHG-0014
title: Publish BlokDust 2 in the original repository
status: done
date: 2026-11-14
specs: [SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION]
adrs: []
---
# CHG-0014: Publish BlokDust 2 in the original repository

## Why
Publish the released V2 source in the original BlokDust repository so the project retains its public history,
community and existing links. Development history is not needed to publish the current source.

## What changes
- Preserve the original V1 tip as `v1-legacy` and `v1-before-v2`, without rewriting V1 commits.
- Introduce the released 2.0.2 source as one snapshot commit whose parent is the original `master` tip.
- Audit the imported source before publishing (SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION R5).
- Document the canonical public repository, the retained V1 source and the license distinction.
- Keep the application, engine, tests and deployment configuration byte-identical to the reviewed release.

## Out of scope
- Importing development commits, changing the existing development repository, deleting branches or repositories.
- Deployments, installer publication and changes to application behavior or its embedded source link. The latter
  still points at the development repository and should change to the public home in the next application release.

## Acceptance
- `pnpm check`: indexes and codegen are current.
- `pnpm bd privacy check`: no imported-source findings; an independent secret scan reports no leaks.
- `pnpm bd privacy history`: inspect and distinguish existing public V1 findings from newly introduced material.
- `git rev-list origin/master..HEAD`: exactly one snapshot commit before merge, with the V1 tip as its parent.
- Compare the imported tree against the reviewed 2.0.2 tree: only README, NOTICE and this change record/index differ.
- Verify the public archive branch/tag resolve to the preserved V1 tip and the migration PR targets `master`.

## Risks and unknowns
- The snapshot intentionally omits V2 development history. V1 history and attribution remain available.
- Existing public V1 history can contain personal author metadata and third-party fixtures; retaining it does not
  mean that a full-history privacy scan is clean. Newly introduced source and metadata are audited separately.
- The development repository remains available to ongoing work; subsequent public updates must use reviewed
  snapshots or an explicitly coordinated branch migration to avoid importing its old history.
