---
id: SHARING-0003
title: MCP server with MCP Apps for in-chat playback only
status: accepted
date: 2026-11-05
domain: sharing
tags: [mcp, ai]
supersedes: []
superseded_by:
---
# SHARING-0003: MCP server with MCP Apps for in-chat playback only

## Context
MCP Apps (official MCP extension, Jan 2026) lets a tool return an interactive iframe UI in Claude, ChatGPT and other hosts.

## Decision
A remote MCP server (Cloudflare Worker) exposes: `list_blocks` (from manifests), `create_patch` (intent graph to laid-out patch), `validate_patch` (lint report plus audio descriptors from an offline render) and `show_patch` (returns the player as an MCP App UI resource). **Playback only:** the chat cannot live-edit a patch the user is playing.

## Consequences
- Requires a layout solver: models describe a graph (emitter to tone to reverb) and the solver places blocks so that proximity yields exactly that graph.
- Hosts without MCP Apps support get a share link as the text result.
