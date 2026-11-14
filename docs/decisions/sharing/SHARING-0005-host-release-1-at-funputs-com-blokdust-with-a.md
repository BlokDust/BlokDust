---
id: SHARING-0005
title: Host Release 1 at funputs.com/blokdust with a Worker route
status: superseded
date: 2026-11-11
domain: sharing
tags: [hosting, domain, release-1]
supersedes: []
superseded_by: SHARING-0006
---
# SHARING-0005: Host Release 1 at funputs.com/blokdust with a Worker route

> Superseded by [SHARING-0006](SHARING-0006-host-at-blokdust-funputs-com-with-funputs-com.md) (2026-11-12): the app
> lives at blokdust.funputs.com and funputs.com/blokdust redirects there. Never deployed.

## Context
Release 1 launches quietly at funputs.com/blokdust (CHG-0005 task 10). SHARING-0004 made every route and link work
under a base path. funputs.com is a Cloudflare zone in the same account, attached as a Custom Domain to the
`funputs-site` Worker (as is www.funputs.com). On one hostname a Worker route takes precedence over a Custom Domain
(Cloudflare docs, Workers › Routes), so `funputs.com/blokdust*` can go to the `blokdust` Worker while the rest of the
site stays with `funputs-site`, untouched.

## Decision
We will serve the production Worker `blokdust` at funputs.com/blokdust through a route `funputs.com/blokdust*`, with
`BASE_PATH` `/blokdust` and `PUBLIC_BASE_URL` `https://funputs.com/blokdust`. The deploy tool copies the web build to
`.cache/server/site/blokdust/`, the asset store of the deployed envs, so the build's files are served from the asset
store at /blokdust/… with no Worker request each; only pages, embeds, oEmbed and the API run the Worker.
Staging gets the same layout on its workers.dev host (…/blokdust/), so review sees what launch serves.
Outside the base path (workers.dev only), links from before the move (`/?c=`, `/embed/`) redirect into it, and the
API also answers at the root for plugin builds that call it there.

## Consequences
- No change to `funputs-site` or its domains; removing the route takes BlokDust off funputs.com again.
- New in Cloudflare (owner OK 2026-11-11): the route, created by the first production deploy after the merge, and
  funputs.com on the production Turnstile widget's hostnames (done 2026-11-11 by `bd server setup --env production`,
  same site key and secret). D1, rate limits and secrets stay as they are.
- Production keeps its workers.dev host: pages there redirect to funputs.com/blokdust (any host other than
  `PUBLIC_BASE_URL`'s), and the API keeps answering. So the plugin's `PUBLIC_SITE` (workers.dev root: its API and
  share links) works before and after the move; the release builds (task 12) can switch it to funputs.com.
- Tests: `pnpm test:sharing:base` (the whole sharing suite under /blokdust, redirects, root API, and the redirect to
  the public host from another one); after the merge, `pnpm bd server smoke --env production` at funputs.com/blokdust.

## Alternatives considered
- **Assets at the asset store's root**: works (a miss falls through to the Worker), but every file of every page
  load would be a Worker request against the free plan's daily limit.
- **A subdomain (blokdust.funputs.com)** as a Custom Domain: simpler, but the owner chose funputs.com/blokdust.
- **Serving BlokDust from `funputs-site`**: couples two projects' deploys.
