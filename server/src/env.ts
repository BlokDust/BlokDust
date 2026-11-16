// Bindings and settings (wrangler.jsonc). Secrets: TURNSTILE_SECRET, FREESOUND_TOKEN, GOOGLE_CLIENT_SECRET, APPLE_PRIVATE_KEY (`pnpm bd server secret`).
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
  /** Sign in with Google (SPEC-SHARING-ACCOUNTS R2a): OAuth client from Google Cloud; the secret is a Worker secret. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Overridable for tests (a local mock); default to Google's endpoints and issuer. */
  GOOGLE_AUTH_URL?: string;
  GOOGLE_TOKEN_URL?: string;
  GOOGLE_ISSUER?: string;
  /** Sign in with Apple (SPEC-SHARING-ACCOUNTS R2b): the Services ID, team and key ids (vars) and the .p8 key (a secret). */
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  /** Overridable for tests (a local mock); default to Apple's endpoints and issuer. */
  APPLE_AUTH_URL?: string;
  APPLE_TOKEN_URL?: string;
  APPLE_ISSUER?: string;
  /** Overridable for tests (a local mock); defaults to https://freesound.org/apiv2. */
  FREESOUND_API?: string;
}

export const LIMITS = {
  /** SPEC-PATCH-FORMAT-V2 R6. */
  patchBytes: 64 * 1024,
  thumbBytes: 512 * 1024,
  titleChars: 64,
  /** v1 Config.SoundCloudMaxTrackLength (s): longer sounds are not offered. */
  maxSampleSeconds: 510,
} as const;
