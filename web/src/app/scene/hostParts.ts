// What v1's scene asks of the app (SceneHost), in parts by topic.
import type { SceneHost } from '../../v1ui/scene/sceneHost.ts';
import type { AccountPage } from '../../v1ui/accountPage/accountPage.ts';
import { scene } from './scene.ts';

export type SceneHostPart<Key extends keyof SceneHost> = Pick<SceneHost, Key>;

/** What v1ui/scene/release1Settings.ts adds to v1's Settings panel: the account tab. */
interface AccountSettings {
  openAccount?: () => void;
  accountPage?: AccountPage | null;
}

export const accountSettings = (): AccountSettings =>
  scene.SettingsPanel as unknown as AccountSettings;

export function openAccountSettings(): void {
  accountSettings().openAccount?.();
}
