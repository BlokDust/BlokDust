# CHG-0044 tasks: Publish BlokDust 2 in the original repository

- [x] 1. Review and merge the 2.0.2 release with lightweight consistency, type and secret checks.
- [x] 2. Preserve the original V1 tip on `v1-legacy` and at `v1-before-v2`.
- [x] 3. Import the released source without its development history and document the public home and V1 archive.
- [x] 4. Verify snapshot fidelity, indexes, privacy and commit ancestry; all full-history findings predate the import.
- [x] 5. Open and verify the single-commit migration PR targeting the original repository's `master`.
- [x] 6. Bring the history after 2.0.2 here: each commit recreated with its own tree, author, dates and message on the
   snapshot (a first commit returns the files to the private 2.0.2 tree), checked commit by commit and with
   `pnpm bd privacy history`; V2 continues on `main`, the default branch.
- [x] 7. Point the app's "View the code on GitHub" link, the guide's footer and NOTICE at this repository.
