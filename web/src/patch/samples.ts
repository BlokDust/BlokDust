// Sample references (DATA-0005, SPEC-SHARING-BACKEND R12–R15): patches name audio, never hold it:
// `freesound:<id>` (anyone can fetch it) or `file:<name>` (fingerprinted; a kept handle reloads).
import { PLUGIN_SITE, apiUrl } from './site.ts';
export interface FreesoundSound {
  id: number;
  name: string;
  username: string;
  license: 'CC0' | 'CC-BY' | 'CC-BY-NC';
  licenseUrl: string;
  duration: number;
  preview: string;
  url: string;
}
export interface FreesoundRef extends FreesoundSound {
  provider: 'freesound';
}
export interface FileRef {
  provider: 'file';
  name: string;
  bytes: number;
  durationSec: number;
  hash: string;
}
export type SampleRef = FreesoundRef | FileRef;

/** v2's default sounds: v1's are gone and we host no audio (DATA-0005), so new Sample and Granular
 * blocks start with a portable CC0 Freesound sound. Convolver keeps the engine's built-in hall. */
declare global {
  interface Window {
    /** File System Access (Chromium); not in every DOM typing. */
    showOpenFilePicker?: (options: unknown) => Promise<FileSystemFileHandle[]>;
  }
}

export const DEFAULT_SOUNDS: Readonly<Record<string, FreesoundRef>> = {
  'source.sample': {
    provider: 'freesound',
    id: 223835,
    name: '[Synth] ambient key',
    username: 'waveplaySFX',
    license: 'CC0',
    licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/',
    duration: 7.68,
    preview: 'https://cdn.freesound.org/previews/223/223835_1676145-hq.mp3',
    url: 'https://freesound.org/people/waveplaySFX/sounds/223835/',
  },
  'source.granular': {
    provider: 'freesound',
    id: 191167,
    name: 'Piano drone',
    username: 'laserlife',
    license: 'CC0',
    licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/',
    duration: 14.8608,
    preview: 'https://cdn.freesound.org/previews/191/191167_2372469-hq.mp3',
    url: 'https://freesound.org/people/laserlife/sounds/191167/',
  },
};
/** A track that names no loadable audio: empty, or one of v1's dead files.blokdust.io defaults. */
export const isDeadDefault = (track: unknown) =>
  track === undefined ||
  track === '' ||
  (typeof track === 'string' && /^https?:\/\/files\.blokdust\.io\//.test(track));

export const refKey = (ref: SampleRef) =>
  ref.provider === 'freesound' ? `freesound:${ref.id}` : `file:${ref.name}`;
export const isPortable = (track: unknown) =>
  typeof track !== 'string' || !track.startsWith('file:');

/** Where the plugins' links and requests go (site.ts). */
export const PUBLIC_SITE = PLUGIN_SITE;
/** The sharing API: this page's Worker, or the public site inside the plugin's WebView. */
const api = apiUrl;

// ---- Freesound ----
export async function searchFreesound(
  query: string,
  maxSeconds: number,
): Promise<FreesoundSound[]> {
  const response = await fetch(
    api(`freesound/search?q=${encodeURIComponent(query)}&max=${Math.round(maxSeconds)}`),
  );
  if (!response.ok) throw new Error(`search failed (${response.status})`);
  return ((await response.json()) as { results: FreesoundSound[] }).results;
}

/** The sound's audio, straight from Freesound's CDN: its saved preview, else a fresh lookup. With
 * `maxSeconds`, an HTTP Range of ~40 kB/s fetches only the start (enough for 320 kbps MP3). */
export async function fetchFreesound(ref: FreesoundRef, maxSeconds?: number): Promise<ArrayBuffer> {
  const headers: Record<string, string> = maxSeconds
    ? { range: `bytes=0-${Math.ceil((maxSeconds + 0.5) * 40_000)}` }
    : {};
  try {
    const response = await fetch(ref.preview, { headers });
    if (response.ok) return await response.arrayBuffer();
  } catch {
    /* fall through to a lookup */
  }
  const soundResponse = await fetch(api(`freesound/sounds/${ref.id}`));
  if (!soundResponse.ok)
    throw new Error(`Freesound sound ${ref.id} unavailable (${soundResponse.status})`);
  const fresh = (await soundResponse.json()) as FreesoundSound;
  const previewResponse = await fetch(fresh.preview, { headers });
  if (!previewResponse.ok)
    throw new Error(`Freesound preview ${ref.id} unavailable (${previewResponse.status})`);
  ref.preview = fresh.preview;
  return previewResponse.arrayBuffer();
}

/** Size + SHA-256 of the first and last 64 KB: recognises the same file again without reading all
 * of it (DATA-0005). */
export async function fingerprint(file: Blob): Promise<{ bytes: number; hash: string }> {
  const EDGE_BYTES = 64 * 1024;
  const head = new Uint8Array(await file.slice(0, EDGE_BYTES).arrayBuffer());
  const tail = new Uint8Array(await file.slice(Math.max(0, file.size - EDGE_BYTES)).arrayBuffer());
  const both = new Uint8Array(head.length + tail.length);
  both.set(head);
  both.set(tail, head.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', both));
  return {
    bytes: file.size,
    hash: 'sha256:' + [...digest].map((b) => b.toString(16).padStart(2, '0')).join(''),
  };
}

const DB = 'blokdust2',
  STORE = 'fileHandles';
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const iDBOpenDBRequest = indexedDB.open(DB, 1);
    iDBOpenDBRequest.onupgradeneeded = () => iDBOpenDBRequest.result.createObjectStore(STORE);
    iDBOpenDBRequest.onsuccess = () => {
      res(iDBOpenDBRequest.result);
    };
    iDBOpenDBRequest.onerror = () => {
      rej(iDBOpenDBRequest.error ?? new Error('IndexedDB did not open'));
    };
  });
}
async function tx<T>(
  mode: IDBTransactionMode,
  fn: (iDBObjectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const iDBDatabase = await db();
  return new Promise((res, rej) => {
    const iDBRequest = fn(iDBDatabase.transaction(STORE, mode).objectStore(STORE));
    iDBRequest.onsuccess = () => {
      res(iDBRequest.result);
    };
    iDBRequest.onerror = () => {
      rej(iDBRequest.error ?? new Error('IndexedDB request failed'));
    };
  });
}
export async function rememberHandle(hash: string, handle: FileSystemFileHandle): Promise<void> {
  try {
    await tx('readwrite', (iDBObjectStore) => iDBObjectStore.put(handle, hash));
  } catch {
    /* no IndexedDB (private mode): this session only */
  }
}
/** A stored file handle; Chromium can ask for read permission again (not in every DOM typing). */
type PermissionHandle = FileSystemFileHandle & {
  queryPermission?: (options: { mode: 'read' }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: 'read' }) => Promise<PermissionState>;
};

export async function handleFor(hash: string): Promise<PermissionHandle | null> {
  try {
    const stored = await tx(
      'readonly',
      (store) => store.get(hash) as IDBRequest<PermissionHandle | undefined>,
    );
    return stored ?? null;
  } catch {
    return null;
  }
}

/** A remembered file, if the browser still lets us read it. `ask` (needs a user gesture) prompts
 * when it would. */
export async function openRemembered(hash: string, ask: boolean): Promise<File | null> {
  const permissionHandle = await handleFor(hash);
  if (!permissionHandle) return null;
  try {
    let state = (await permissionHandle.queryPermission?.({ mode: 'read' })) ?? 'granted';
    if (state === 'prompt' && ask)
      state = (await permissionHandle.requestPermission?.({ mode: 'read' })) ?? 'denied';
    return state === 'granted' ? await permissionHandle.getFile() : null;
  } catch {
    return null;
  }
}

const AUDIO_TYPES = [
  {
    description: 'Audio',
    accept: {
      'audio/*': [
        '.wav',
        '.mp3',
        '.ogg',
        '.oga',
        '.flac',
        '.aif',
        '.aiff',
        '.m4a',
        '.aac',
        '.webm',
        '.opus',
      ],
    },
  },
];
/** A file picker: File System Access where available (keeps a handle), else <input type=file>. */
export async function pickAudioFile(): Promise<{
  file: File;
  handle: FileSystemFileHandle | null;
} | null> {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: AUDIO_TYPES,
        excludeAcceptAllOption: false,
        multiple: false,
      });
      return { file: await handle.getFile(), handle };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null; // cancelled
      // Not allowed here (e.g. cross-origin iframe): fall back to the plain input.
    }
  }
  return new Promise((res) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = () => {
      const file = input.files?.[0];
      res(file ? { file: file, handle: null } : null);
    };
    input.oncancel = () => {
      res(null);
    };
    input.click();
  });
}
