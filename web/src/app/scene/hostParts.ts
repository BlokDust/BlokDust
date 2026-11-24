// What v1's scene asks of the app (SceneHost), in parts by topic.
import type { SceneHost } from '../../v1ui/scene.ts';
import { scene } from './scene.ts';

export type SceneHostPart<Key extends keyof SceneHost> = Pick<SceneHost, Key>;

/** Settings › SIGN IN / ACCOUNT, which release1Settings adds to v1's Settings panel. */
interface AccountSettingsPanel {
  openAccount?: () => void;
}

export function openAccountSettings(): void {
  (scene.SettingsPanel as unknown as AccountSettingsPanel).openAccount?.();
}
