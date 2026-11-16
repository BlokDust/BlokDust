// Bindings and settings (wrangler.jsonc). Secrets: TURNSTILE_SECRET, FREESOUND_TOKEN (`pnpm bd server secret`).
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Per-IP limits (Workers rate limiting binding): saves, and Freesound lookups (one shared key, 2000/day). */
  SAVE_LIMIT?: RateLimit;
  SEARCH_LIMIT?: RateLimit;
  /** Absolute origin + base path used in every link we hand out (SHARING-0004). Empty: derived from the request. */
  PUBLIC_BASE_URL?: string;
  /** Path prefix the app is served under ("" or "/blokdust"). */
  BASE_PATH?: string;
  /** A former base path ("/blokdust", SHARING-0006): its pages 302 to the public site's root, its API answers in place. */
  LEGACY_BASE_PATH?: string;
  /** Where the web build sits in the asset store: "" (its root) or the base path (deployed copies, CHG-0005 task 10). */
  ASSET_BASE?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  /** Overridable for tests (a local mock); defaults to Cloudflare's siteverify. */
  TURNSTILE_VERIFY_URL?: string;
  FREESOUND_TOKEN?: string;
  /** Overridable for tests (a local mock); defaults to https://freesound.org/apiv2. */
  FREESOUND_API?: string;
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
  /** Cloudflare Access in front of /admin/*: https://<team>.cloudflareaccess.com and the application's AUD tag. */
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /** Local tests only: the dashboard without Access. Never set on a deployed env. */
  ADMIN_LOCAL?: string;
  /** Sentry for the web app's errors (public DSN, EU region) and the environment name it reports. R9. */
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
