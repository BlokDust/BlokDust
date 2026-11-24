// Plugin sign-in with a device code (CHG-0039, SHARING-0011), the plugin's side: ask for a code, show it (and open the
// website at it where the plugin can), then ask every few seconds until it is approved there; the answer carries the
// plugin's own key, once.
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
  const r = await fetch(apiUrl('device/start'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const j = (await r.json().catch(() => ({}))) as DeviceCode & { error?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { status: r.status });
  return j;
}
/** The iPad app's native sign-in (SHARING-0011): POST to `/api/app/…` (no cookie; the answer carries the key). */
export async function appPost<T>(path: string, body: unknown = {}): Promise<T> {
  const r = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { status: r.status });
  return j;
}
export async function pollDevice(deviceCode: string): Promise<DevicePoll> {
  const r = await fetch(apiUrl('device/poll'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceCode }),
  });
  const j = (await r.json().catch(() => null)) as DevicePoll | null;
  if (j && typeof j.status === 'string') return j;
  throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
}
