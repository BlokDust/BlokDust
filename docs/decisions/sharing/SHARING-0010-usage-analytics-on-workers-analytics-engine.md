---
id: SHARING-0010
title: Usage analytics on Workers Analytics Engine
status: proposed
date: 2026-11-16
domain: sharing
tags: [analytics, privacy, plugin, cloudflare]
supersedes: []
superseded_by:
---
# SHARING-0010: Usage analytics on Workers Analytics Engine

## Context
After launch the only usage number was the installer download count (PLUGIN-0005). The owner wants to know what people
make (blocks, samples, saves, shares), where they come from, and how many people use BlokDust in a DAW (which DAW,
which version), without a cookie banner, without a new paid service, and without risking the other funputs sites:
the Workers free plan's 100k requests a day are shared by the whole account, and every BlokDust page load already
goes through the Worker.

Options compared with the owner on 2026-11-15/16: PostHog (free 1M events a month, a third party, a cookie or a
cookieless mode, autocapture would burn the allowance, session replay useless on a canvas app), Cloudflare Web
Analytics (free, cookieless, but no custom events), and Workers Analytics Engine (free 100k data points a day, 3-month
retention, SQL API, no dashboard).

## Decision
We will record a fixed list of anonymous events (server/src/events.ts) through the existing Worker
(`POST /api/events`) into one Workers Analytics Engine dataset per environment, and read them with a small private
dashboard at `/admin/analytics` behind Cloudflare Access (plus `pnpm bd analytics`).

- No cookies and nothing stored on the device: web visitors are counted by a hash of the IP and user agent with a
  random salt that is replaced daily and then deleted (D1 `analytics_salt`). Raw IPs are never stored.
- Plugins send one `plugin_active` ping a day per install when BlokDust's window opens, with a random install id the
  Worker stores only as a hash. Opt-out (owner, 1b): a very small switch beside the version number on Settings › About.
  The same switch turns the website's events and error reports off in that browser.
- A kill switch and sample rate: the Worker tells each page its `ANALYTICS_RATE` (0 = off); sampled events carry their
  weight. Production ships with 0 until the owner turns it on.
- Web errors go to Sentry (EU region, owner's account), errors only, no replay, no PII, scrubbed URLs and file names.
  Plugins never install a crash handler in the DAW's process.
- The owner moves the account to Workers Paid before public sharing grows (no daily cap; analytics then costs cents).

## Consequences
- Easier: product questions answered without a third party for usage data; same Worker, same deploy, same privacy
  tooling. The ingest is allow-listed, so the dataset holds only the shapes we defined.
- Harder: we own the dashboard and its queries. Counts are estimates (unauthenticated endpoint, sampling). Raw data is
  kept 3 months; longer trends need a D1 roll-up (follow-up).
- Until Workers Paid, analytics requests (about two per session) count against the account's daily free requests;
  the rate setting is the lever, and Cloudflare usage notifications should be on.
- The iPad AUv3 needs a privacy manifest and the network-client entitlement before its ping can ship (CHG-0025).

## Alternatives considered
- **PostHog**: would keep analytics off the Cloudflare quota, but adds a third-party processor and script, needs its
  cookieless mode to avoid a banner, and doesn't remove the shared-quota risk (page loads already use the Worker).
  Event names carry over if we switch later.
- **Cloudflare Web Analytics only**: free and banner-free, but page views only; no custom events.
- **Opt-in consent prompt in the plugin**: legally safest but undercounts; the owner chose opt-out with a visible switch.
- **Sentry in the plugins**: a native crash handler would also catch the DAW's own crashes; rejected.
