---
id: SHARING-0004
title: Host on a placeholder Cloudflare URL with a configurable base path
status: accepted
date: 2026-11-05
domain: sharing
tags: [hosting, domain]
supersedes: []
superseded_by:
---
# SHARING-0004: Host on a placeholder Cloudflare URL with a configurable base path

## Context
femurdesign.com is served by GitHub Pages, so a Cloudflare Worker cannot serve `femurdesign.com/blokdust` unless the domain's DNS moves to Cloudflare. The owner may recover blokdust.com. The domain must not block development.

## Decision
Deploy to a placeholder `*.workers.dev` URL. Every absolute URL (share links, oEmbed, OG tags, embed `src`, MCP resources) is built from one `PUBLIC_BASE_URL` setting, and every route works under a base path (`/` or `/blokdust`). Share ids are domain-independent.

## Consequences
Moving later is a configuration change plus redirects from the placeholder. Links made before the move keep working through the redirect.

## Options for the final home
- **blokdust.com** on Cloudflare: preferred if recovered.
- Move femurdesign.com DNS to Cloudflare (free plan). GitHub Pages keeps serving the site, and a Worker route takes `/blokdust*`.
- A subdomain such as `blokdust.femurdesign.com`, pointed at the Worker with a single DNS record.
