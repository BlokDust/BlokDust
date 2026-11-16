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
- Windows tests: `BLOKDUST_VM_DIR`, `BLOKDUST_VM_USER` and optional `BLOKDUST_VM_*` resource settings. Provision a VM
  separately; the test driver does not distribute a personal VM image, login, key or provisioning instructions.
- Cloudflare: `CLOUDFLARE_ACCOUNT_ID`, `BLOKDUST_WORKERS_SUBDOMAIN`, per-environment public URLs, database IDs and
  Turnstile site keys. `bd server setup` saves discovered settings externally. Remote commands generate a private,
  per-checkout Wrangler configuration outside the checkout, with absolute build/migration paths. The committed
  Wrangler configuration contains only local test settings and remote placeholders.
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
