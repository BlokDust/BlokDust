// Plugin sign-in by device code (SHARING-0011), plugin side: get a code, show it (open the website
// at it if possible), ask every few seconds until approved there; the answer carries the key, once.
import { apiUrl } from '../patch/site.ts';

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verifyUrl: string;
  verifyAt: string;
  interval: number;
  expiresIn: number;
}
export type DevicePoll =
  | { status: 'pending' | 'slow_down' | 'denied' | 'expired' }
  | { status: 'approved'; key: string; user: { handle: string | null } };

export async function startDevice(name: string): Promise<DeviceCode> {
  const response = await fetch(apiUrl('device/start'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const j = (await response.json().catch(() => ({}))) as DeviceCode & { error?: string };
  if (!response.ok)
    throw Object.assign(new Error(j.error ?? `HTTP ${response.status}`), {
      status: response.status,
    });
  return j;
}
/** The iPad app's native sign-in (SHARING-0011): POST to `/api/app/…` (no cookie; the answer
 * carries the key). */
export async function appPost<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok)
    throw Object.assign(new Error(j.error ?? `HTTP ${response.status}`), {
      status: response.status,
    });
  return j;
}
export async function pollDevice(deviceCode: string): Promise<DevicePoll> {
  const response = await fetch(apiUrl('device/poll'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceCode }),
  });
  const j = (await response.json().catch(() => null)) as DevicePoll | null;
  if (j && typeof j.status === 'string') return j;
  throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
}
