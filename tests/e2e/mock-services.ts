// Stand-ins for the third-party services the Worker calls (CHG-0003 tests): Freesound's API (search, sound, preview
// audio) and Turnstile's siteverify. Deterministic: fixed results, previews are generated WAVs.
import { createServer, type Server } from 'node:http';

/** The sounds every mocked search returns (titles/users also used by the v1 SoundCloud mock in `bd ui`). */
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
  const n = Math.round(seconds * rate), data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * freq * i / rate) * Math.exp(-2 * i / n) * 0.6 * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

export interface MockServices { url: string; server: Server; requests: { path: string; auth: string | undefined }[]; close(): void }

export async function startMockServices(): Promise<MockServices> {
  const requests: MockServices['requests'] = [];
  let base = '';
  const sound = (s: typeof MOCK_SOUNDS[number]) => ({
    id: s.id, name: s.name, username: s.username, duration: 1.5,
    license: s.id % 3 === 0 ? 'https://creativecommons.org/licenses/by-nc/4.0/' : s.id % 2 ? 'http://creativecommons.org/publicdomain/zero/1.0/' : 'https://creativecommons.org/licenses/by/4.0/',
    url: `https://freesound.org/people/${s.username}/sounds/${s.id}/`,
    previews: { 'preview-hq-mp3': `${base}/previews/${s.id}.wav`, 'preview-lq-mp3': `${base}/previews/${s.id}.wav` },
  });
  const server = createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://x');
    requests.push({ path: u.pathname + u.search, auth: req.headers.authorization });
    const send = (status: number, body: unknown, type = 'application/json') =>
      res.writeHead(status, { 'content-type': type, 'access-control-allow-origin': '*' }).end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    if (u.pathname === '/siteverify' && req.method === 'POST') {
      let body = '';
      req.on('data', c => (body += c));
      req.on('end', () => send(200, { success: !body.includes('fail') && body.includes('response') }));
      return;
    }
    if (u.pathname.startsWith('/apiv2/') && req.headers.authorization !== 'Token test-freesound-key') return send(401, { detail: 'bad token' });
    if (u.pathname === '/apiv2/search/text/') {
      const q = (u.searchParams.get('query') ?? '').toLowerCase();
      const results = q.includes('nothing') ? [] : MOCK_SOUNDS.map(sound);
      return send(200, { count: results.length, results });
    }
    const one = u.pathname.match(/^\/apiv2\/sounds\/(\d+)\/$/);
    if (one) { const s = MOCK_SOUNDS.find(x => x.id === Number(one[1])); return s ? send(200, sound(s)) : send(404, { detail: 'Not found' }); }
    const prev = u.pathname.match(/^\/previews\/(\d+)\.wav$/);
    if (prev) { const s = MOCK_SOUNDS.find(x => x.id === Number(prev[1])); return s ? send(200, sineWav(s.freq), 'audio/wav') : send(404, ''); }
    // A third-party page embedding a patch the way oEmbed consumers do (the iframe HTML from /oembed).
    if (u.pathname === '/host.html') return send(200, `<!doctype html><meta charset="utf-8"><title>Host</title><body style="margin:0;background:#fff">${u.searchParams.get('html') ?? ''}</body>`, 'text/html');
    send(404, { detail: 'Not found' });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { url: base, server, requests, close: () => server.close() };
}
