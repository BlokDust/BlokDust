// The microphone for Microphone and Audio In blocks, and the guard on others' patches.
import { juce } from '../boot/page.ts';
import { engine } from '../model/engineLink.ts';
import { model } from '../model/patchModel.ts';
import { inside, macros } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';

export const needsInput = (type: string) =>
  type === 'source.microphone' || type === 'source.audio-in';

/** Someone else's patch on the website (a link, the gallery, an embed; CHG-0041): its microphone
 * waits for TURN ON, its sound goes through EngineNode.setGuard. Not your own or the plugins'. */
export let guarded = false,
  inputAllowed = false,
  inputAsked = false;

export function setGuarded(on: boolean): void {
  if (juce) return;
  if (on && !guarded) {
    inputAllowed = false;
    inputAsked = false;
  }
  guarded = on;
  engine?.setGuard(on);
  if (!on && [...model.values()].some((b) => needsInput(b.type))) listen();
}

/** Open the microphone for a Microphone or Audio In block: at once, unless the patch is someone
 * else's (then the message bar asks first). `byUser`: the user put the block there themselves. */
export function listen(byUser = false): void {
  if (!engine) return;
  if (byUser) inputAllowed = true;
  if (guarded && !inputAllowed) {
    if (inputAsked) return;
    inputAsked = true;
    scene.message('This patch uses your microphone.', {
      buttonText: 'Turn on',
      buttonEvent: () => {
        inputAllowed = true;
        void engine?.connectMicrophone();
      },
    });
    return;
  }
  void engine.connectMicrophone();
}

export let inputCheckQueued = false;

/** With no listening block left (Microphone, Audio In, a Stage holding one), let the microphone go
 * so the browser stops showing it in use (CHG-0035). Not inside a Stage: outer blocks are aside. */
export function releaseInputIfUnused(): void {
  if (inputCheckQueued) return;
  inputCheckQueued = true;
  queueMicrotask(() => {
    inputCheckQueued = false;
    if (!engine || inside) return;
    const listens = [...model.values()].some(
      (b) =>
        needsInput(b.type) ||
        (b.type === 'source.stage' && !!macros.get(b.uid)?.blocks.some((x) => needsInput(x.type))),
    );
    if (!listens) engine.disconnectMicrophone();
  });
}
