// What the API refuses (SPEC-SHARING-BACKEND R3–R6), run by tests/e2e/sharing.ts.
import {
  type SharingTests,
  remote,
  created,
  base,
  check,
  api,
  PATCH,
  markSearchLimited,
} from './harness.ts';

export const apiGuardTests: SharingTests = {
  /** SPEC-SHARING-BACKEND R3–R6: the API refuses what it must (needs the siteverify mock for the failing token). */

  async 'api-guards'() {
    check(
      'no bot-check token → 403',
      (await api('POST', 'patches', { patch: PATCH })).status === 403,
    );
    if (!remote)
      check(
        'failed bot check → 403',
        (await api('POST', 'patches', { patch: PATCH, turnstile: 'fail' })).status === 403,
      );
    check(
      'not a v2 patch → 400',
      (await api('POST', 'patches', { patch: { blocks: 'x' }, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' }))
        .status === 400,
    );
    const big = {
      ...PATCH,
      blocks: [
        ...PATCH.blocks,
        { id: 'pad', type: 'source.tone', x: 9, y: 9, params: { note: 'x'.repeat(70000) } },
      ],
    };
    check(
      'patch over 64 KB → 413',
      (await api('POST', 'patches', { patch: big, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' })).status ===
        413,
    );
    check(
      'thumb not a PNG → 400',
      (
        await api('POST', 'patches', {
          patch: PATCH,
          thumb: btoa('GIF89a'),
          turnstile: 'XXXX.DUMMY.TOKEN.XXXX',
        })
      ).status === 400,
    );
    check('unknown id → 404', (await api('GET', 'patches/A000000000')).status === 404);
    check('malformed id → 404', (await api('GET', 'patches/..%2Fx')).status === 404);
    if (!remote) {
      // R5a: per-IP limits. Freesound lookups share one key (2000/day): the 61st in a minute is refused.
      let codes: number[] = [];
      for (let i = 0; i < 62; i++)
        codes.push((await fetch(`${base}/api/freesound/sounds/101`)).status);
      markSearchLimited();
      check(
        'Freesound lookups are rate limited per client (429 after 60/min)',
        codes.slice(0, 60).every((c) => c === 200) && codes.at(-1) === 429,
        { first: codes[0], last: codes.at(-1) },
      );
      codes = [];
    }
    if (remote) return; // creating needs a real Turnstile token remotely
    const c = await api('POST', 'patches', {
      patch: PATCH,
      title: 'Guard',
      turnstile: 'XXXX.DUMMY.TOKEN.XXXX',
    });
    check(
      'create → 201 with id and edit token',
      c.status === 201 && /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/.test(c.json?.id) && !!c.json?.editToken,
      c.json,
    );
    created.push({ id: c.json.id, token: c.json.editToken });
    check(
      'overwrite without token → 403',
      (
        await api('PUT', `patches/${c.json.id}`, {
          patch: PATCH,
          turnstile: 'XXXX.DUMMY.TOKEN.XXXX',
        })
      ).status === 403,
    );
    check(
      'overwrite with a wrong token → 403',
      (
        await api(
          'PUT',
          `patches/${c.json.id}`,
          { patch: PATCH, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' },
          'nope',
        )
      ).status === 403,
    );
    const s = await api(
      'PUT',
      `patches/${c.json.id}`,
      { patch: { ...PATCH, seed: 2 }, title: 'Guard 2', turnstile: 'XXXX.DUMMY.TOKEN.XXXX' },
      c.json.editToken,
    );
    const g = await api('GET', `patches/${c.json.id}`);
    check(
      'overwrite with its token → same id, rev 2, new content',
      s.status === 200 &&
        g.json?.rev === 2 &&
        g.json?.patch?.seed === 2 &&
        g.json?.title === 'Guard 2',
      g.json,
    );
    const a = await api('POST', 'patches', {
      patch: PATCH,
      parent: c.json.id,
      turnstile: 'XXXX.DUMMY.TOKEN.XXXX',
    });
    check('save-as records the parent', a.status === 201 && a.json?.parent === c.json.id, a.json);
    created.push({ id: a.json.id, token: a.json.editToken });
    check(
      'delete without token → 403',
      (await api('DELETE', `patches/${a.json.id}`)).status === 403,
    );
    check(
      'delete with token → 204, then 410 (deleted)',
      (await api('DELETE', `patches/${a.json.id}`, undefined, a.json.editToken)).status === 204 &&
        (await api('GET', `patches/${a.json.id}`)).status === 410,
    );
  },
};
