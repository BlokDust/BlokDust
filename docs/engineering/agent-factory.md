# Agent workflow: the software factory

BlokDust 2 is built by one human plus AI coding agents from several providers. The process is designed so agents **verify their own work** and **reuse tools instead of re-deriving work** (PROCESS-0002, inspired by Swamp Club's "behaviour-centric" approach: the LLM handles intent and judgement; deterministic, typed, reusable tools do the mechanics).

## The loop

1. **Pick work** from a change in `docs/specs/changes/` (tasks.md) or create one: `pnpm bd new change "Title"`.
2. **Read narrowly**: the change proposal → the specs it lists → the ADRs it lists. Use the generated indexes, not repo-wide searches.
3. **Check the tool registry** (`tools/README.md`). If a mechanical step exists as a tool, use it. If you are about to do something mechanical for the second time, **make it a tool** first.
4. **Implement** against spec requirement IDs (R1, R2 …). Reference them in tests and commit messages.
5. **Verify** with the gates below. Don't hand back until they pass, or until you can show precisely what fails and why.
6. **Record**: tick tasks.md; new decisions → `pnpm bd new adr <domain> "Title"`; behaviour changes → update the spec; `pnpm bd index`.

## Verification gates (PROCESS-0004)

| Gate | Command (as built) | Proves |
|---|---|---|
| Docs + codegen | `pnpm check` | ADR/spec/tool indexes current; manifests valid; generated C++/TS in sync |
| Block geometry | `pnpm bd v1 verify` | Every block manifest re-renders v1's pixels exactly (1× and 2×) |
| Engine | `pnpm engine:configure && pnpm engine:build && pnpm test:engine` | Unit, simulation, audio and determinism tests (also `--preset release`, `--preset asan`) |
| Web | `pnpm web:typecheck && pnpm web:build && pnpm test:web` | Typecheck, production build, browser smoke test |
| Determinism | `pnpm bd render --compare-wasm` | WASM ≡ native |
| Visual | `pnpm bd visual diff` | Parity with v1 references (SPEC-VISUAL-V1-PARITY) |
| Black-box | `pnpm test:e2e` | Real app driven by Playwright: drag, connect, hear (audio buffer non-silent) |
| Plugin | `pnpm bd plugin validate` | pluginval + headless host render |

## Writing a tool

```
tools/<name>/index.ts   # node, no build step (Node ≥ 24 strips TS types)
tools/<name>/tool.json  # { name, summary, usage[], outputs, deterministic }
```
Rules: JSON results on **stdout**, human diagnostics on **stderr**; non-zero exit on failure; no network unless the tool's purpose is network; idempotent; `--check` mode for anything that generates files. Run `pnpm bd index` to register it.

## Cost discipline
- Prefer one tool call returning a JSON summary over reading many files.
- Generated indexes exist so agents can load a single domain's ADRs.
- Keep large artefacts (screenshots, WAVs) out of context; tools report hashes and diff stats, and only failing images are opened.
