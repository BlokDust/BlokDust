// bd release tag: tag a release on main (docs/engineering/branches-and-releases.md).
//   pnpm bd release tag --dry-run         check only: say what would be tagged, and what ships from it
//   pnpm bd release tag [--notes <file>]  tag vX.Y.Z on HEAD, push the tag, and publish its GitHub release (notes from
//                                         <file>, or GitHub's list of merged pull requests)
// Checks first: HEAD is main (or release/X.Y.x for a fix) and matches origin, the tree is clean, both package.json
// files say the same version, and that version's tag doesn't exist yet. It deploys nothing: it prints the ship steps
// (production, installers, iPad), each on the owner's go.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const sh = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
};
const git = (...args: string[]) => sh('git', args);
const versionOf = (file: string) =>
  (JSON.parse(readFileSync(file, 'utf8')) as { version: string }).version;

export function releaseTag(args: string[]): void {
  const dryRun = args.includes('--dry-run');
  const notes = args.includes('--notes') ? args[args.indexOf('--notes') + 1] : null;
  const version = versionOf('package.json'),
    tag = `v${version}`;
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').out;
  git('fetch', '--quiet', '--tags', 'origin');
  const head = git('rev-parse', 'HEAD').out,
    upstream = git('rev-parse', `origin/${branch}`).out;
  const problems: string[] = [];
  if (branch !== 'main' && !/^release\/\d+\.\d+\.x$/.test(branch))
    problems.push(`HEAD is ${branch}: tag on main, or release/X.Y.x for a fix`);
  else if (head !== upstream) problems.push(`HEAD is not origin/${branch}: pull or push first`);
  if (git('status', '--porcelain').out) problems.push('the working tree has uncommitted changes');
  if (versionOf('web/package.json') !== version)
    problems.push(
      `web/package.json says ${versionOf('web/package.json')}, package.json ${version}`,
    );
  if (git('rev-parse', '--verify', '--quiet', `refs/tags/${tag}`).ok)
    problems.push(`${tag} already exists`);
  if (!/^\d+\.\d+\.\d+$/.test(version)) problems.push(`${version} is not X.Y.Z`);
  if (notes && !existsSync(notes)) problems.push(`no notes file ${notes}`);
  // A release whose installers are older (web/src/releases.json) is site-only: the installers aren't rebuilt.
  const installers = (
    JSON.parse(readFileSync('web/src/releases.json', 'utf8')) as { version: string }
  ).version;
  const siteOnly = installers !== version;
  const ship = [
    'pnpm bd server deploy --env production',
    'pnpm bd server smoke --env production',
    ...(siteOnly
      ? []
      : [
          'pnpm bd plugin package',
          'pnpm bd win package',
          'pnpm bd release publish',
          'commit web/src/releases.json through a pull request, then deploy production again',
          'pnpm bd plugin ios archive --upload',
        ]),
  ];
  const summary = { tag, commit: head.slice(0, 8), branch, siteOnly, installers, ship, problems };
  if (problems.length || dryRun) {
    console.log(JSON.stringify({ ...summary, tagged: false, dryRun }));
    if (problems.length) process.exit(1);
    return;
  }

  const made = git('tag', '-a', tag, '-m', `BlokDust ${version}`);
  if (!made.ok) throw new Error(`git tag failed: ${made.err}`);
  const pushed = git('push', '--quiet', 'origin', tag);
  if (!pushed.ok) {
    git('tag', '-d', tag);
    throw new Error(`pushing ${tag} failed (local tag removed): ${pushed.err}`);
  }
  const rel = sh('gh', [
    'release',
    'create',
    tag,
    '--title',
    `BlokDust ${version}`,
    '--verify-tag',
    ...(branch === 'main' ? ['--latest'] : []),
    ...(notes ? ['--notes-file', notes] : ['--generate-notes']),
  ]);
  console.log(
    JSON.stringify({
      ...summary,
      tagged: true,
      release: rel.ok ? rel.out : null,
      ...(rel.ok ? {} : { releaseError: rel.err }),
    }),
  );
  if (!rel.ok) process.exit(1);
}
