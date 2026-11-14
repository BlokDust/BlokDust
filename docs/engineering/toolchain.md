# Toolchain

| Area | Tool | Version policy |
|---|---|---|
| Tools/scripts | Node.js (TS via native type stripping) | ≥ 24 (`.nvmrc`) |
| Packages | pnpm | pinned via `packageManager` |
| Web | Vite 8.3.6, TypeScript 7.0.2, PixiJS 8.22.0, Playwright 1.64.1 | exact versions pinned in package.json |
| Engine | C++20, CMake ≥ 3.28, Catch2 v3.8.1 (FetchContent) | presets in `CMakePresets.json`: dev, release, asan |
| Web engine | Emscripten (emsdk) | pinned version in `engine/emsdk-version` |
| Plugin | JUCE 8.0.15 (AGPLv3, CMake FetchContent), pluginval 1.0.4 (`.cache/pluginval`) | pinned tags |
| Web engine | Emscripten 6.0.13 via `pnpm bd wasm setup` (`.cache/emsdk`, needs Python ≥ 3.10) | `engine/emsdk-version` |
| Backend | Cloudflare Workers, D1, Wrangler | pinned in `server/package.json` |

Everything is installed into the repo's gitignored `.cache/` or `build/` by tools: `pnpm bd v1 fetch`, `pnpm bd wasm setup`, and `pnpm bd plugin build` (JUCE and pluginval). `pnpm bd ci` runs every check locally; GitHub Actions is manual-only for now.
