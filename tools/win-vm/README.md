# tools/win-vm

Driver for an externally configured Windows ARM test VM. Set its directory and SSH user in the external
`config.env`; see [local configuration](../../docs/engineering/local-configuration.md). Provision Windows,
SSH, build tools and the test applications separately. Private disks and keys stay outside the repository.

Use it through `pnpm bd win …`, which runs the scripts here and judges the results on the Mac:

| Command | What it proves |
|---|---|
| `pnpm bd win engine` | MSVC x64 build, all Catch2 tests, golden renders **bit-identical to macOS** (`engine-check.ps1`) |
| `pnpm bd win plugin` | x64 VST3 build; golden renders through the built VST3; state round-trip; WebView2 editor builds the stage (`bd_ready`); pluginval strictness 5 with editor tests; REAPER loads it, opens the window and meters audio (`plugin-check.ps1`, `reaper-smoke.ps1`) |
| `pnpm bd win package` | The Windows installer (Inno Setup, `installer.iss`; unsigned for Release 1): Release x64 build, `BlokDust-<version>-Windows.exe` copied to `build/plugin-release/dist`, then a silent install / uninstall check (`package.ps1`, `install-check.ps1`). Inno Setup 6 was installed in the VM with winget (2026-11-11) |
| `pnpm bd win shot out.png` | Screenshot of the VM desktop |
| `tools/win-vm/vm.sh start\|stop\|status\|ssh\|sync` | Raw VM control |

Notes:
- Builds live in `C:\blokdust-build` (outside the synced tree, which `sync` replaces wholesale).
- The WebView2 SDK is fetched once with `nuget` into `C:\blokdust-build\.webview2`; the plugin defines
  `JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING`, without which JUCE silently falls back to Internet Explorer.
- Anything needing a desktop (WebView2, pluginval editor tests, REAPER) runs through `run-interactive.ps1`, a
  scheduled task on the auto-logged-in desktop; an SSH session has none.
- The VM is ARM64 running x64 builds under emulation with software rendering: correctness, not performance.
- REAPER in the VM is unregistered (evaluation dialog appears); Windows is unactivated. Both are fine for testing.
