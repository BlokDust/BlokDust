// v1's UI scene, and what it asks of the app (SceneHost) put together from its parts.
import { V1Scene } from '../../v1ui/scene/v1Scene.ts';
import { accountHost } from './accountHost.ts';
import { blockHost } from './blockHost.ts';
import { currentLinkWay } from './linkWays.ts';
import { patchesHost } from './patchesHost.ts';
import { settingsHost } from './settingsHost.ts';
import { soundHost } from './soundHost.ts';

export let scene!: V1Scene;

export function init(): void {
  scene = new V1Scene({
    ...blockHost(),
    ...soundHost(),
    ...settingsHost(),
    ...patchesHost(),
    ...accountHost(),
    // A getter: the way can change once the plugin signs in.
    get links() {
      return currentLinkWay();
    },
  });
}
