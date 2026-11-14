---
id: UI-0001
title: Render the stage with PixiJS v8
status: accepted
date: 2026-11-05
domain: ui
tags: [ui, rendering, pixi]
supersedes: []
superseded_by:
---
# UI-0001: Render the stage with PixiJS v8

## Context
v1 redraws everything on a Canvas2D every frame through a custom framework (Fayde/etch). This is slow with many blocks and particles.

## Decision
Use **PixiJS v8** (WebGL2, WebGPU when available) for the stage. Block geometry is generated from block manifests (DATA-0002) as cached Graphics/Meshes, particles use a ParticleContainer, and beams and connection lines are batched. DOM is used only for text-heavy chrome where pixel parity allows it.

## Consequences
- Anti-aliasing differs from Canvas2D, so visual parity uses a perceptual threshold, not exact pixel equality (UI-0002).
- Fonts are Dosis and Merriweather Sans (OFL), loaded locally.
