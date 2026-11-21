# Branches and releases

BlokDust uses trunk-based development: `main` is always the latest working code, and a release is a tag on it.

## Branches
- **`main`**: protected. Changes arrive only through pull requests, with no force pushes and no deleting. Every
  merge goes to **staging** (`pnpm bd server deploy --env staging`), and staging only ever runs `main`. Test a
  feature branch locally before it merges.
- **Feature branches**: short-lived, cut from `main` and named for what they do (`feat/…`, `fix/…`, `docs/…`).
  Merge them once their tests pass. Unfinished work that has to merge early goes behind a setting or flag, not on a
  long-lived branch.
- **`release/X.Y.x`**: only for a fix to a release when `main` has moved on. Cut it from the release's tag, fix
  there, tag the patch release, then merge the fix into `main`. Delete it once nothing more will ship from it.

## Versions
[Semantic versioning](https://semver.org/), from the root `package.json` (CMake, the plug-ins and the installers
read it):
- **Patch** (2.1.1): fixes only.
- **Minor** (2.2.0): new blocks or features. Old patches still open.
- **Major** (3.0.0): a change that old patches or plug-in projects can't follow.

## Releasing
1. Bump the version on `main` through a pull request, and check staging.
2. Tag the commit and push the tag: `git tag -a vX.Y.Z -m "BlokDust X.Y.Z"`, then `git push origin vX.Y.Z`.
3. Ship from that tag, each step on the owner's go:
   - `pnpm bd server deploy --env production`, then `pnpm bd server smoke --env production`
   - `pnpm bd plugin package` and `pnpm bd win package`, then `pnpm bd release publish`. Commit the updated
     `web/src/releases.json` through a pull request and deploy the site again.
   - `pnpm bd plugin ios archive --upload` for the iPad app
4. Publish a GitHub release for the tag, with notes and links to the installers.

A site-only fix can go to production between releases, but it still ships from a tag (a patch release), so
`git checkout vX.Y.Z` always gives the code that is live.
