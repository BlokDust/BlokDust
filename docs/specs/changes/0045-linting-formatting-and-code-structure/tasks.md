# CHG-0045 tasks: Linting, formatting and code structure

Check items off as they land. Each task should be independently verifiable.

- [ ] 1. Type-check tools/, tests/, shared/ and the glossary
- [ ] 2. ESLint (strict type-checked) with a suppression baseline, `bd lint`, `pnpm lint`
- [ ] 3. Prettier and clang-format over the whole codebase
- [ ] 4. Fix ESLint findings area by area until the baseline is empty
- [ ] 5. `bd comments` with a baseline; shorten comments until it is empty
- [ ] 6. C++ warnings as errors everywhere; clang-tidy with a determinism ban list
- [ ] 7. `[[clang::nonblocking]]` audio-thread entry points, `-Wfunction-effects`, RealtimeSanitizer preset
- [ ] 8. `bd lint` in `bd ci` and the pre-commit hook
- [ ] 9. Split files over the size limit by concern; empty size baseline
- [ ] 10. ADR, docs, full `bd ci`, staging deploy, PR
