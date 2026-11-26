# CHG-0045 tasks: Linting, formatting and code structure

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Type-check tools/, tests/, shared/ and the glossary
- [x] 2. ESLint (strict type-checked) with a suppression baseline, `bd lint`, `pnpm lint`
- [x] 3. Prettier and clang-format over the whole codebase
- [x] 4. Fix ESLint findings in web/, server/, shared/, tests/ and v1ui (zero there); tools/ cleaned of real bugs
- [ ] 4a. Follow-up change: type `tools/` JSON (`no-unsafe-*`, `any`) and the block designer; empty the ESLint baseline
- [x] 5. `bd comments` with a baseline; comments shortened outside tools/
- [ ] 5a. Follow-up change: shorten the remaining comments (mostly tools/); empty the comments baseline
- [x] 6. C++ warnings as errors everywhere; clang-tidy with a determinism ban list; every finding but short names
  fixed or `NOLINT` with a reason (1018 → 823); a malformed DAW project no longer crashes the plugin
  (SPEC-PATCH-FORMAT-V2 R3b)
- [ ] 6a. Follow-up change: descriptive C++ names where they help (`readability-identifier-*`, 823)
- [x] 7. `[[clang::nonblocking]]` audio-thread entry points, `-Wfunction-effects`, RealtimeSanitizer preset
- [x] 8. `bd lint` in `bd ci` and the pre-commit hook
- [x] 9. Split TypeScript files over the size limit by concern (web, tests, v1ui, tools/v1, tools/plugin)
- [ ] 9a. Follow-up change: split the ten C++ files and the block designer page over the limit; empty the size baseline
- [ ] 10. ADR, docs, full `bd ci`, staging deploy, PR
