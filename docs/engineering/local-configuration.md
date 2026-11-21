# Private operational configuration

Public documentation describes workflows and variable names. Personal settings and machine notes live outside
all checkouts, in `~/.config/blokdust/config.env` and `~/.config/blokdust/LOCAL.md`. Agents MUST read the local notes
before deployment, signing, notarization or tests on configured machines. Never copy values, machine details or
private diagnostics into source, commits, PRs, generated docs or screenshots intended for publication.

Copy `config.example.env` to that directory, fill only the required settings and restrict the file to its owner
(`chmod 600`). The shared loader parses dotenv without executing shell code. Process environment takes precedence;
`BLOKDUST_CONFIG_DIR` may select another external directory. No local file is needed for public builds or mock tests.
Tools fail with the missing variable's name when an operation needs an unconfigured setting.

- Plugin deployment: `BLOKDUST_TEST_HOST` (SSH host alias or user/host); private keys stay in the SSH agent or SSH directory.
- Signing: `BLOKDUST_SIGNING_IDENTITY`, `BLOKDUST_INSTALLER_IDENTITY`, `BLOKDUST_APPLE_TEAM_ID` and
  `BLOKDUST_NOTARY_PROFILE`. Certificates, private keys and notarization credentials stay in macOS Keychain.
- iPad (CHG-0025): `BLOKDUST_IOS_SIMULATOR` (a Simulator name for `bd plugin ios test`) and `BLOKDUST_IOS_DEVICE` (an
  iPad's name or identifier for `bd plugin ios device`). Device builds sign with `BLOKDUST_APPLE_TEAM_ID` through
  Xcode's automatic signing, which needs the team's Apple account in Xcode → Settings → Accounts.
  `BLOKDUST_IOS_NATIVE_SIGN_IN=1` builds in Sign in with Apple and the site's passkeys (SHARING-0011) once the App ID
  has the Sign in with Apple and Associated Domains capabilities; the sites come from the public URLs below.
  The App Store build (`bd plugin ios archive`) signs and uploads with an App Store Connect API key (Admin access):
  `BLOKDUST_ASC_KEY_ID`, `BLOKDUST_ASC_ISSUER_ID` and the key file `app_store_connect_key.p8` beside this file
  (`BLOKDUST_ASC_KEY_PATH` overrides); command-line builds can't use the account signed in to Xcode.
- Plugin sign-in (CHG-0039): `bd plugin deploy` and `bd plugin ios device` build the plugins' page against
  `BLOKDUST_STAGING_PUBLIC_URL`, installers against `BLOKDUST_PRODUCTION_PUBLIC_URL` (`BLOKDUST_PLUGIN_SITE_URL`
  overrides a plain `pnpm web:build`). `BLOKDUST_APPLE_APP_ID` overrides the app id the Worker is given (default: the
  app's bundle id).
- Windows tests: `BLOKDUST_VM_DIR`, `BLOKDUST_VM_USER` and optional `BLOKDUST_VM_*` resource settings. Provision a VM
  separately; the test driver does not distribute a personal VM image, login, key or provisioning instructions.
- Cloudflare: `CLOUDFLARE_ACCOUNT_ID`, `BLOKDUST_WORKERS_SUBDOMAIN`, per-environment public URLs, database IDs and
  Turnstile site keys. Support has separate `BLOKDUST_STAGING_SUPPORT_DATABASE_ID` /
  `BLOKDUST_PRODUCTION_SUPPORT_DATABASE_ID` settings. `bd server setup` saves discovered settings externally. Remote commands generate a private,
  per-checkout Wrangler configuration outside the checkout, with absolute build/migration paths. The committed
  Wrangler configuration contains only local test settings and remote placeholders.
- Usage analytics (SHARING-0010), optional per environment: `BLOKDUST_<ENV>_ACCESS_TEAM_DOMAIN` and
  `BLOKDUST_<ENV>_ACCESS_AUD` (Cloudflare Access in front of `/admin/*`), `BLOKDUST_<ENV>_SENTRY_DSN`, and
  `BLOKDUST_PRODUCTION_ANALYTICS_RATE` (production's committed default is 0, off). The dashboard's Account Analytics:
  Read token lives in the secret file `analytics_token`; `bd server secret` uploads it with the account id.
- Existing secret files `freesound_token`, `turnstile_staging` and `turnstile_production` stay in the external config
  directory. `bd server secret` sends them over stdin to Wrangler; deployed values stay in Cloudflare secret storage.
  Wrangler login or an environment-supplied `CLOUDFLARE_API_TOKEN` provides deploy authorization.

Keep host settings out of frontend variables. Plugin API URLs use the public product URL, which is intentionally
visible in the application. Signing certificates also identify their publisher in distributed binaries.

Run `pnpm bd privacy check` before committing, and `pnpm bd privacy history` before publication. Checks report
locations and categories without printing matched values. Gitignore is a second layer, not secret storage.
Configure a GitHub noreply Git email for future commits. Public owner credits and required license notices remain.
Performance tools write raw machine measurements under ignored `.cache/`; publish only deliberately anonymized summaries.

History cleanup rewrites commit IDs and requires coordinated force pushes. Local reflogs are not pushed. GitHub's
read-only PR refs, caches, other clones and backups require separate treatment; a clean branch audit does not prove
those copies were purged. Keep recovery copies private and never push an old backup into a cleaned repository.
