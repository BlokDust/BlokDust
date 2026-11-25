// Bindings and settings (wrangler.jsonc). Secrets: TURNSTILE_SECRET, FREESOUND_TOKEN,
// GOOGLE_CLIENT_SECRET, APPLE_PRIVATE_KEY (`pnpm bd server secret`).

/** A setting that must be there for this feature (`name` says which, if it isn't). */
export function setting(value: string | undefined, name: string): string {
  if (!value) throw new Error(`BlokDust: ${name} is not set`);
  return value;
}

export interface Env {
  DB: D1Database;
  SUPPORT_DB?: D1Database;
  SUPPORT_LIMIT?: RateLimit;
  ASSETS: Fetcher;
  /** Per-IP limits (Workers rate limiting): saves, and Freesound lookups (one key, 2000/day). */
  SAVE_LIMIT?: RateLimit;
  SEARCH_LIMIT?: RateLimit;
  /** Origin + base path for every link handed out (SHARING-0004); empty: from the request. */
  PUBLIC_BASE_URL?: string;
  /** Path prefix the app is served under ("" or "/blokdust"). */
  BASE_PATH?: string;
  /** A former base path ("/blokdust", SHARING-0006): pages 302 to the site root, API in place. */
  LEGACY_BASE_PATH?: string;
  /** The web build's place in the asset store: "" (root) or the base path (CHG-0005 task 10). */
  ASSET_BASE?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  /** Overridable for tests (a local mock); defaults to Cloudflare's siteverify. */
  TURNSTILE_VERIFY_URL?: string;
  FREESOUND_TOKEN?: string;
  /** Sign in with Google (SPEC-SHARING-ACCOUNTS R2a): the OAuth client; its secret a secret. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Overridable for tests (a local mock); default to Google's endpoints and issuer. */
  GOOGLE_AUTH_URL?: string;
  GOOGLE_TOKEN_URL?: string;
  GOOGLE_ISSUER?: string;
  /** Sign in with Apple (R2b): Services ID, team and key ids (vars), the .p8 key (a secret). */
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  /** The iPad app's id (its bundle id), for Sign in with Apple in the app and the site's
   * apple-app-site-association (SHARING-0011). */
  APPLE_APP_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  /** Overridable for tests (a local mock); default to Apple's endpoints and issuer. */
  APPLE_AUTH_URL?: string;
  APPLE_TOKEN_URL?: string;
  APPLE_ISSUER?: string;
  /** Overridable for tests (a local mock); defaults to https://freesound.org/apiv2. */
  FREESOUND_API?: string;
  /** "off" stops the page-close activity request (R16) when D1's free writes run short (saves still
   * carry it); a var, or `wrangler secret put ACTIVITY_BEACON` to flip it with no deploy. */
  ACTIVITY_BEACON?: string;
  /** New accounts a network may make in a UTC day (SPEC-SHARING-ACCOUNTS R1b). Unset: 10. */
  ACCOUNTS_PER_DAY?: string;
  // ---- usage analytics (SHARING-0010, SPEC-SHARING-USAGE-ANALYTICS) ----
  /** Workers Analytics Engine dataset the events go to. Without it nothing is recorded. */
  EVENTS?: AnalyticsEngineDataset;
  /** Per-IP limit on POST /api/events. */
  EVENTS_LIMIT?: RateLimit;
  /** Share of sessions that send events, "0" (off: the kill switch) … "1" (all). R5. */
  ANALYTICS_RATE?: string;
  /** The dataset's name, for the dashboard's queries (the binding only writes). */
  ANALYTICS_DATASET?: string;
  /** Secrets for the dashboard's queries: the account, and an Account Analytics: Read token. */
  CF_ACCOUNT_ID?: string;
  CF_ANALYTICS_TOKEN?: string;
  /** Tests: a mock SQL API instead of Cloudflare's. */
  ANALYTICS_SQL_URL?: string;
  /** Cloudflare Access on /admin/*: https://<team>.cloudflareaccess.com and its AUD tag. */
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /** Local tests only: the dashboard without Access. Never set on a deployed env. */
  ADMIN_LOCAL?: string;
  /** Sentry for the web app's errors (public DSN, EU region) and its environment name (R9). */
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
}

export const LIMITS = {
  /** SPEC-PATCH-FORMAT-V2 R6. */
  patchBytes: 64 * 1024,
  thumbBytes: 512 * 1024,
  titleChars: 64,
  /** v1 Config.SoundCloudMaxTrackLength (s): longer sounds are not offered. */
  maxSampleSeconds: 510,
} as const;
