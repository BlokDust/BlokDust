---
id: ARCHITECTURE-0003
title: One TypeScript UI bundle for web, embed, plugin and MCP App
status: accepted
date: 2026-11-05
domain: architecture
tags: [ui, webview, mcp]
supersedes: []
superseded_by:
---
# ARCHITECTURE-0003: One TypeScript UI bundle for web, embed, plugin and MCP App

## Context
Four surfaces must look identical: the website, embeds, the plugin editor and in-chat MCP Apps. Building native UIs per surface would multiply work and break visual parity.

## Decision
`web/` produces one UI codebase (TypeScript, PixiJS stage, light DOM chrome) with build entry points for: **app** (full editor), **player** (embed/MCP: stage plus play, no editing chrome) and **plugin** (app with a host bridge instead of the WASM engine). The plugin shows it through JUCE 8's WebView.

## Consequences
- The engine transport is an interface: `WasmEngineTransport` (AudioWorklet MessagePort) or `HostEngineTransport` (JUCE WebView native functions/events).
- Plugin UI performance depends on the system WebView (WKWebView / WebView2), so Phase 0 spikes it.
