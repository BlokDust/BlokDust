# CHG-0008 tasks

- [x] Define private configuration and generic agent instructions (R1–R3).
- [x] Migrate signing, deployment, VM testing and raw reports (R3–R4).
- [x] Add safe examples, private-config tests and redacted privacy checks (R5).
- [x] Verify configuration, builds, sharing and deployment dry-run.
- [x] Rewrite history and verify remote refs; record hosting limitations privately.

Validation: docs/codegen and privacy checks pass; configuration tests cover environment precedence, dotenv safety,
missing settings and symlink isolation; frontend/Worker typechecks and frontend build pass; Wrangler dry-run passes;
sharing 59/59, base-path sharing 69/69, UI regressions 62/62. Rebuilt plugins deployed with valid signatures.
The local notarization profile still needs setup in Keychain. Remote branches and current PR refs use cleaned history;
GitHub still resolves an old SHA, so hosting retention cleanup remains external to the branch rewrite. Recovery details
and the support-request draft live in the external private migration directory.
