---
id: PROCESS-0004
title: Every change is self-verified: unit, golden-audio, visual and black-box tests
status: accepted
date: 2026-11-05
domain: process
tags: [testing, agents]
supersedes: []
superseded_by:
---
# PROCESS-0004: Every change is self-verified: unit, golden-audio, visual and black-box tests

## Decision
A change is done only when an agent can prove it without a human:
- C++ unit tests (engine, sim).
- **Golden-audio tests**: offline-render fixture patches and compare against references with tolerance.
- **Visual tests**: v2 versus v1 reference screenshots, and the block library.
- **Black-box E2E tests**: Playwright drives the real web app (drag blocks, check connections and that audio is produced). The plugin is tested headlessly through pluginval and a host harness.
