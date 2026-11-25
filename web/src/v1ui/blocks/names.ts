// A block's name as v1 showed it (its l10n entry), and sample lengths as the search shows them.
import type { BlockDef } from '../../generated/blocks.gen.ts';
import { App } from '../shim.ts';

const CATEGORY: Partial<Record<string, string>> = {
  source: 'Source',
  effect: 'Effect',
  power: 'Power',
  interaction: 'Interaction',
};
/** v1 l10n's block names and descriptions, by category. */
interface L10nCategory {
  Label: string;
  Blocks: Partial<Record<string, { name: string; description: string }>>;
}
const L10N_BLOCKS: Partial<Record<string, L10nCategory>> = App.L10n.Blocks;
/** v1's l10n key where it differs from the block's v1 type. */
const KEY_BY_TYPE: Partial<Record<string, string>> = {
  ToneSource: 'Tone',
  ParticleEmitter: 'ParticleEmitter',
  ComputerKeyboard: 'ComputerKeyboard',
  MIDIController: 'MIDIController',
};

function categoryOf(def: BlockDef): string {
  return CATEGORY[def.category] ?? 'Source';
}
/** The l10n key for a block: v1 uses e.g. Blocks.Source.Blocks.Tone for ToneSource. */
function nameKey(def: BlockDef): string {
  const names = L10N_BLOCKS[categoryOf(def)]?.Blocks ?? {};
  const v1Type = def.v1Type ?? '';
  const key = KEY_BY_TYPE[v1Type] ?? v1Type;
  return key in names
    ? key
    : (Object.keys(names).find((name) => name.toLowerCase() === v1Type.toLowerCase()) ?? key);
}
/** The name v1 showed for a block (its own name for the post-2.0 blocks). */
export function v1BlockName(def: BlockDef): string {
  return def.v1Type
    ? (L10N_BLOCKS[categoryOf(def)]?.Blocks[nameKey(def)]?.name ?? def.name)
    : def.name;
}

/** A sample length as m:ss (h:mm:ss from an hour; a sound under a second shows 0:01). */
export function formatLength(seconds: number): string {
  const value = Number(seconds) || 0,
    total = value > 0 ? Math.max(1, Math.round(value)) : 0,
    hours = Math.floor(total / 3600),
    minutes = Math.floor(total / 60) % 60,
    secs = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}
