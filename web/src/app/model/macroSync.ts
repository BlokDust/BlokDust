// The plugin's processor keeps the DAW project's patch: what is inside each Stage goes to it.
import { juce } from '../boot/page.ts';
import { toPatch } from './toPatch.ts';

const SETTLE_MS = 50;

export let sentMacros = '[]';
let macrosTimer: ReturnType<typeof setTimeout> | undefined;

export function setSentMacros(sent: string): void {
  sentMacros = sent;
}

export const syncMacros = () => {
  if (!juce) return;
  clearTimeout(macrosTimer);
  macrosTimer = setTimeout(() => {
    const json = JSON.stringify(toPatch().macros ?? []);
    if (json === sentMacros) return;
    sentMacros = json;
    juce?.emitEvent('bd_macros', { macros: JSON.parse(json) as unknown });
  }, SETTLE_MS);
};
