// Stand-ins for the services the Worker calls (CHG-0003 tests): Freesound, Turnstile, Google and
// Apple sign-in. Deterministic: fixed results, previews are generated WAVs.
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { createServer, type Server } from 'node:http';

/** The sounds every mocked search returns (also the v1 SoundCloud mock's, in `bd ui`). */
export const MOCK_SOUNDS = [
  { id: 101, name: 'Glass Bell Long', username: 'resonancia', freq: 660 },
  { id: 102, name: 'Analog Pad Swell', username: 'modulator_k', freq: 220 },
  { id: 103, name: 'Field Recording Birds Morning', username: 'dawnchorus', freq: 880 },
  { id: 104, name: 'Kick Drum Deep', username: 'beatsmith', freq: 55 },
  { id: 105, name: 'Rain On Tin Roof', username: 'wetweather', freq: 330 },
  { id: 106, name: 'Plucked Kalimba C', username: 'thumbpiano', freq: 523.25 },
  { id: 107, name: 'Cello Drone D', username: 'lowstrings', freq: 146.83 },
];

/** A 1.5 s mono 16-bit WAV: a decaying sine at `freq` (no randomness). */
export function sineWav(freq: number, seconds = 1.5, rate = 44100): Buffer {
  const frameCount = Math.round(seconds * rate),
    data = Buffer.alloc(frameCount * 2);
  for (let i = 0; i < frameCount; i++)
    data.writeInt16LE(
      Math.round(
        Math.sin((2 * Math.PI * freq * i) / rate) * Math.exp((-2 * i) / frameCount) * 0.6 * 32767,
      ),
      i * 2,
    );
  const bytes = Buffer.alloc(44);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + data.length, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(data.length, 40);
  return Buffer.concat([bytes, data]);
}

export interface MockServices {
  url: string;
  server: Server;
  requests: { path: string; auth: string | undefined }[];
  googleAuths: { challenge: string | null; method: string | null; client: string | null }[];
  /** Sign in with Apple (R2b): requests seen, client secrets checked, and the test key (PKCS#8,
   * base64) for APPLE_PRIVATE_KEY. */
  appleAuths: { mode: string | null; scope: string | null; client: string | null }[];
  appleSecrets: boolean[];
  appleKey: string;
  close(): void;
}

/** The claims of the client secret the Worker sends Apple. */
interface AppleClaims {
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: number;
}

export async function startMockServices(): Promise<MockServices> {
  const requests: MockServices['requests'] = [];
  const googleAuths: MockServices['googleAuths'] = [];
  /** Who signs in at the mock consent page next (`GET /google/next?user=`): google-sub-<user>. */
  let nextGoogle = 'alice';
  const appleAuths: MockServices['appleAuths'] = [],
    appleSecrets: boolean[] = [];
  /** Apple's key for this run: the Worker signs its client secret with the private half. */
  const apple = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const appleKey = apple.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
  let base = '';
  const sound = (mock: (typeof MOCK_SOUNDS)[number]) => ({
    id: mock.id,
    name: mock.name,
    username: mock.username,
    duration: 1.5,
    license:
      mock.id % 3 === 0
        ? 'https://creativecommons.org/licenses/by-nc/4.0/'
        : mock.id % 2
          ? 'http://creativecommons.org/publicdomain/zero/1.0/'
          : 'https://creativecommons.org/licenses/by/4.0/',
    url: `https://freesound.org/people/${mock.username}/sounds/${mock.id}/`,
    previews: {
      'preview-hq-mp3': `${base}/previews/${mock.id}.wav`,
      'preview-lq-mp3': `${base}/previews/${mock.id}.wav`,
    },
  });
  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url ?? '/', 'http://x');
    requests.push({
      path: requestUrl.pathname + requestUrl.search,
      auth: req.headers.authorization,
    });
    const send = (status: number, body: unknown, type = 'application/json') =>
      res
        .writeHead(status, { 'content-type': type, 'access-control-allow-origin': '*' })
        .end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    if (requestUrl.pathname === '/siteverify' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () =>
        send(200, { success: !body.includes('fail') && body.includes('response') }),
      );
      return;
    }
    // Google OAuth (CHG-0023): consent returns a code at once; the token is unsigned (the Worker
    // checks issuer, audience, expiry over TLS) for google-sub-<code>; a "-bad" code is refused.
    if (requestUrl.pathname === '/google/next') {
      nextGoogle = requestUrl.searchParams.get('user') ?? 'alice';
      return send(200, { ok: true });
    }
    if (requestUrl.pathname === '/google/auth') {
      const back = new URL(requestUrl.searchParams.get('redirect_uri') ?? '/');
      back.searchParams.set('code', nextGoogle);
      back.searchParams.set('state', requestUrl.searchParams.get('state') ?? '');
      googleAuths.push({
        challenge: requestUrl.searchParams.get('code_challenge'),
        method: requestUrl.searchParams.get('code_challenge_method'),
        client: requestUrl.searchParams.get('client_id'),
      });
      res.writeHead(302, { location: back.toString() }).end();
      return;
    }
    if (requestUrl.pathname === '/google/token' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const form = new URLSearchParams(body),
          code = form.get('code') ?? '';
        if (code.endsWith('-bad') || !form.get('code_verifier'))
          return send(400, { error: 'invalid_grant' });
        const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
        const id = `${b64({ alg: 'RS256' })}.${b64({ iss: 'https://accounts.google.com', aud: 'test-google-client', sub: `google-sub-${code}`, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;
        send(200, { access_token: 'at', token_type: 'Bearer', expires_in: 600, id_token: id });
      });
      return;
    }
    // Apple (R2b): as Google's, but the client secret is an ES256 JWT about the Services ID,
    // checked with the run's public key; the subject is apple-sub-<user>.
    if (requestUrl.pathname === '/apple/auth') {
      const back = new URL(requestUrl.searchParams.get('redirect_uri') ?? '/');
      back.searchParams.set('code', nextGoogle);
      back.searchParams.set('state', requestUrl.searchParams.get('state') ?? '');
      appleAuths.push({
        mode: requestUrl.searchParams.get('response_mode'),
        scope: requestUrl.searchParams.get('scope'),
        client: requestUrl.searchParams.get('client_id'),
      });
      res.writeHead(302, { location: back.toString() }).end();
      return;
    }
    if (requestUrl.pathname === '/apple/token' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        // The secret is about the website's Services ID or the iPad app's id (SHARING-0011).
        // An app's code carries the nonce Apple would put in its token: "<user>~<nonce>".
        const form = new URLSearchParams(body),
          client = form.get('client_id') ?? '',
          [user, nonce] = (form.get('code') ?? '').split('~'),
          code = user,
          [header, payload, sig] = (form.get('client_secret') ?? '').split('.');
        let ok: boolean;
        try {
          const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AppleClaims,
            head = JSON.parse(Buffer.from(header, 'base64url').toString()) as {
              alg?: string;
              kid?: string;
            };
          ok =
            createVerify('SHA256')
              .update(`${header}.${payload}`)
              .verify(
                { key: apple.publicKey, dsaEncoding: 'ieee-p1363' },
                Buffer.from(sig, 'base64url'),
              ) &&
            head.alg === 'ES256' &&
            head.kid === 'test-key-id' &&
            claims.iss === 'test-team' &&
            (client === 'test-apple-client' || client === 'test.app.id') &&
            claims.sub === client &&
            claims.aud === 'https://appleid.apple.com' &&
            (claims.exp ?? 0) > Date.now() / 1000;
        } catch {
          ok = false;
        }
        appleSecrets.push(ok);
        if (!ok || code.endsWith('-bad')) return send(400, { error: 'invalid_client' });
        const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
        const id = `${b64({ alg: 'RS256' })}.${b64({ iss: 'https://appleid.apple.com', aud: client, sub: `apple-sub-${code}`, exp: Math.floor(Date.now() / 1000) + 600, ...(nonce ? { nonce } : {}) })}.sig`;
        send(200, { access_token: 'at', token_type: 'Bearer', expires_in: 600, id_token: id });
      });
      return;
    }
    if (
      requestUrl.pathname.startsWith('/apiv2/') &&
      req.headers.authorization !== 'Token test-freesound-key'
    )
      return send(401, { detail: 'bad token' });
    if (requestUrl.pathname === '/apiv2/search/text/') {
      const query = (requestUrl.searchParams.get('query') ?? '').toLowerCase();
      const results = query.includes('nothing') ? [] : MOCK_SOUNDS.map(sound);
      return send(200, { count: results.length, results });
    }
    const one = /^\/apiv2\/sounds\/(\d+)\/$/.exec(requestUrl.pathname);
    if (one) {
      const mock = MOCK_SOUNDS.find((x) => x.id === Number(one[1]));
      return mock ? send(200, sound(mock)) : send(404, { detail: 'Not found' });
    }
    const prev = /^\/previews\/(\d+)\.wav$/.exec(requestUrl.pathname);
    if (prev) {
      const mock = MOCK_SOUNDS.find((x) => x.id === Number(prev[1]));
      return mock ? send(200, sineWav(mock.freq), 'audio/wav') : send(404, '');
    }
    // A third-party page embedding a patch as oEmbed consumers do (the iframe HTML from /oembed).
    if (requestUrl.pathname === '/host.html')
      return send(
        200,
        `<!doctype html><meta charset="utf-8"><title>Host</title><body style="margin:0;background:#fff">${requestUrl.searchParams.get('html') ?? ''}</body>`,
        'text/html',
      );
    send(404, { detail: 'Not found' });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return {
    url: base,
    server,
    requests,
    googleAuths,
    appleAuths,
    appleSecrets,
    appleKey,
    close: () => server.close(),
  };
}
