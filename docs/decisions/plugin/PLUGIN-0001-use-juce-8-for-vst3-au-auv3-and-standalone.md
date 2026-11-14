---
id: PLUGIN-0001
title: Use JUCE 8 for VST3, AU, AUv3 and Standalone
status: accepted
date: 2026-11-05
domain: plugin
tags: [juce, vst3, au, auv3]
supersedes: []
superseded_by:
---
# PLUGIN-0001: Use JUCE 8 for VST3, AU, AUv3 and Standalone

## Context
The owner asked for the best tool for the job. Since the project is AGPL (LICENSING-0001), JUCE's AGPL option needs no commercial licence for desktop builds.

## Decision
`plugin/` uses **JUCE 8** with CMake to build VST3, AU, AUv3 (iPadOS) and Standalone. The editor is a `WebBrowserComponent` hosting the `web/` plugin bundle (ARCHITECTURE-0003). The engine is linked as a static library.

## Evidence
CHG-0001 task 0.11 (`pnpm bd plugin test`): JUCE 8.0.15 builds VST3, AU and Standalone. pluginval (strictness 5) passes on the VST3. A headless host loads the built VST3 binary, sets each script-free golden fixture as state, and renders output bit-identical to the native engine. The WebView editor loads the embedded web bundle and builds the stage from the plugin's patch. The engine stays JUCE-free; only `plugin/` links JUCE.

## Consequences
- macOS builds need code signing and notarisation (Apple Developer Program). Windows VST3 needs the WebView2 runtime.
- CLAP can be added later through JUCE's CLAP extensions or clap-wrapper.

## Alternatives considered
- **CLAP + clap-wrapper (MIT)**: permissive, but AUv3/iOS and WebView editor support are weaker.
- **iPlug2**: permissive, has a web target, but a smaller ecosystem.
