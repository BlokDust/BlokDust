# CHG-0009 tasks: Add in-app feedback and private support reports

- [x] 1. Record owner choices, support spec and storage ADR.
- [x] 2. Dedicated support schema/API, size/type/rate guards, independent migrations and scheduled retention.
- [x] 3. Shared client/server patch and system allowlists; bounded sanitised diagnostic history.
- [x] 4. Settings entry, themed accessible panel, optional email, reference and manual failure/retry flow.
- [x] 5. Explicit automatic-reporting consent, deduplication/caps and no persistent queue.
- [x] 6. Plugin system metadata and configurable public support endpoint.
- [x] 7. Prepare triage fields, immutable submissions and separate staff/automation history.
- [x] 8. Integration coverage: 35 checks pass via `pnpm test:support`, including actual scheduled cleanup.
- [x] 9. Complete relevant regression/visual checks and record final results.
- [x] 10. Plugin test-host deployment and final review notes.

## Verification

- `pnpm check`, web and Worker typechecks: pass.
- `pnpm test:support`: 35 checks pass, including separate D1 storage, privacy guards, rate limits, offline/manual
  delivery, automatic consent/deduplication/caps and actual 90/365-day scheduled cleanup.
- `pnpm test:web` and `pnpm test:e2e`: pass (library smoke, patch editing, audio, autosave and share round-trip).
- `pnpm test:sharing`: 57/57 pass.
- `pnpm test:ui-regressions`: all 41 existing checks pass. New `feedback-legacy-dialog` and the updated Tour/Support
  check pass after the fallback fix (42 distinct cases covered in total).
- `pnpm bd ui diff`: 39/39 pass. `pnpm bd visual diff --full`: 525/525 pixel-identical.
- `pnpm bd plugin test`: both VST3 pluginval checks and all 16 native host/editor cases pass, including native support
  system metadata reaching the UI. `pnpm test:support:plugin`: actual WebView submission and staging D1 context pass;
  the test removes its report afterward.
- `pnpm bd privacy check` and `pnpm bd privacy selftest`: pass; no private environment values in committed artifacts.

## Regression evidence

The first legacy-dialog check failed with `this.dialog.showModal is not a function`. The initial fallback then
exposed canvas pointer focus overriding the text field (`opened: true, focused: false`). The final regression
passes with opened, focused, trapped and closed all true. The fix supplies a legacy modal/focus path without
changing generated v1 UI code. Diagnostic/test outputs stay in ignored cache/output directories.

## Review and operational scope

The staging support database and daily cleanup trigger are provisioned; production is unchanged. The dedicated
backend is write-only publicly; initial staff review uses authenticated provider access. See
[staff operations](../../../engineering/support-reports.md). No dashboard, AI classifier execution or automatic email
integration is included. Native crashes and audio-quality monitoring remain outside the agreed scope. Windows
WebView2 submission and a physical older macOS WebView have not been exercised; the legacy dialog behaviour is
covered by browser regression. The macOS native plugin submission is exercised against staging.

Staging deployment and the configured macOS test-host installation completed successfully; all four instrument/FX
VST3/AU bundles passed signature verification. The review plugins target the staging support API.

## Connect panel review (release/2.0.1)

- [x] Rebase the feedback commit onto release/2.0.1, preserving Tempo, Patches, licence assets and root deployment.
- [x] Restore CONNECT and replace its retired social contents with the form; remove the separate modal and Settings action.
- [x] Draw labels/inputs with existing typography metrics, the real OptionSwitch and the coloured Connect button.
- [x] Remove disclosure copy, shorten email text and success copy, keep API identifiers internal.
- [x] Make the inclusion switch control optional patch/system/diagnostic context on client and server, without background consent.
- [x] Verify the rebased integration, panel/mobile regressions, sharing and plugin submission; update staging/test plugins.

The `support-connect` regression failed on the previous build (missing switch/form in Connect) before the replacement.
Earlier verification above records the original full-screen implementation; current review results follow below.

### Current review verification

- Rebased onto release/2.0.1 at c6cfe9a; release ancestry verified.
- Web/Worker typechecks, `pnpm check`, current-file privacy check and privacy self-tests pass.
- `pnpm test:support` and `pnpm test:support:base`: 36 checks pass each, including selected context omission,
  “Thank you” without an identifier, input hiding on tab changes and mobile bounds. Based-path bindings/migrations
  remain compatible with the release branch's root/base routing tests.
- Sharing: 65/65 pass. Web library smoke passes. Settings/theme-next v1 UI comparisons both pass.
- Targeted Connect, Tempo, About and Download regressions pass; the full rebased UI suite passes all 72 checks.
- Native plugin validation/host cases pass on the rebased engine, including support metadata. Staging and all four
  macOS test-host plugin bundles updated, with signatures verified.
- `pnpm bd privacy history` reports three pre-existing merge-commit metadata email findings (cf8376f4e92b,
  b6f8408a95ed, cb433b228d9a). Current files have zero findings. Shared release history is not rewritten by this change.

The rebased snapshot initially dropped connectionOrder (failing remapped-order assertion); support sanitisation now
preserves valid effect-order pairs using remapped IDs, covered in both root and base-path support integration runs.

Final native Connect submission and staging database verification pass; the smoke report is removed afterward.
The last test-host copy initially failed sealed-resource verification. Deployment now compares rsync checksums;
the subsequent copy passes signature verification for all four VST3/AU bundles.
