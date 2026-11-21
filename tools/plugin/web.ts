// The web build the plugins embed (CHG-0039): which server their page talks to is fixed when it is built.
import { spawnSync } from 'node:child_process';
import { requiredSetting } from '../lib/local-config.ts';

/**
 * The web build the plugins embed, talking to `target`'s server (web/src/patch/site.ts, CHG-0039): the owner reviews
 * plugins against staging (bd plugin deploy, bd plugin ios device); installers always talk to the live site.
 */
export function webBuildFor(target: 'staging' | 'production'): void {
  const site = requiredSetting(target === 'staging' ? 'BLOKDUST_STAGING_PUBLIC_URL' : 'BLOKDUST_PRODUCTION_PUBLIC_URL');
  // The CONNECT form goes to the same server (owner, 2026-11-19: from the review plugins it went to the live site,
  // which has no support endpoint before the release).
  const env = { ...process.env, BLOKDUST_PLUGIN_SITE_URL: site, BLOKDUST_SUPPORT_PUBLIC_URL: site };
  if (spawnSync('pnpm', ['web:build'], { stdio: 'inherit', env }).status !== 0) throw new Error('web build failed');
}

