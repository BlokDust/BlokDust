---
id: SHARING-0006
title: Host at blokdust.funputs.com with funputs.com/blokdust redirecting
status: accepted
date: 2026-11-12
domain: sharing
tags: [hosting, domain, release-1]
supersedes: [SHARING-0005]
superseded_by:
---
# SHARING-0006: Host at blokdust.funputs.com with funputs.com/blokdust redirecting

## Context
SHARING-0005 put Release 1 at funputs.com/blokdust. On 2026-11-12, before anything was deployed there, the owner
chose blokdust.funputs.com instead. A subdomain keeps a standalone creative application apart from the Funputs
commercial product range. funputs.com/blokdust should still lead to the app: a redirect for now, perhaps a short
landing page about the project later. funputs.com is a Cloudflare zone in the same account, a Custom Domain of the
`funputs-site` Worker. blokdust.funputs.com has no DNS record yet.

## Decision
We will serve the production Worker `blokdust` at the root of **blokdust.funputs.com**, a Custom Domain created by
the production deploy (`BASE_PATH` "", `PUBLIC_BASE_URL` `https://blokdust.funputs.com`, the build served from the
asset store's root). A Worker route `funputs.com/blokdust*` sends that path to the same Worker. There, and on any host
under `LEGACY_BASE_PATH` `/blokdust`, pages answer with a **302** to the same page at the root of the public site.
The redirect is temporary so that a landing page can replace it later without browsers having cached it. The API
under `/blokdust/api/…` keeps answering in place. Staging uses the same layout at the root of its workers.dev host.

## Consequences
- No change to `funputs-site` or its domains. A landing page later means removing the route and adding the page to
  `funputs-site` (or keeping the route and serving the page from this Worker).
- New in Cloudflare (owner, 2026-11-12): the Custom Domain blokdust.funputs.com (its DNS record and certificate are
  managed by Cloudflare) and the route `funputs.com/blokdust*`. Both are created by the first production deploy after
  the merge. Before that deploy, `bd server setup --env production` adds blokdust.funputs.com to the production
  Turnstile widget. funputs.com stays on that widget; it's harmless and costs nothing.
- Production's workers.dev pages still redirect to the public site, and its API keeps answering.
- The base-path support from SHARING-0004 stays, but no deployed env uses it. The local `based` env and
  `pnpm test:sharing:base` keep it tested.
- Links to staging under …/blokdust/ from earlier reviews keep working through the legacy redirect.
- Tests: `pnpm test:sharing` (root layout) checks the legacy redirect and the canonical host redirect.
  `pnpm test:sharing:base` checks the base path. After the merge, run `pnpm bd server smoke --env production` at
  blokdust.funputs.com and check the funputs.com/blokdust redirect by hand.

## Alternatives considered
- **Keep funputs.com/blokdust (SHARING-0005)**: ties the app to the Funputs storefront's URL space.
- **A 301 redirect**: browsers cache it for good, which would get in the way of a landing page there later.
- **Redirect from `funputs-site`**: couples the two projects' deploys. With a route on this Worker,
  `funputs-site` stays untouched.
