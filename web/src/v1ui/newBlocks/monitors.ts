// The engine's live readouts (Engine::monitors), by block id: meters, counters, an LFO's value now.
import { App } from '../shim.ts';

/** Each monitor entry is a block id and four values. */
const ENTRY = 5;
const monitors = new Map<number, number[]>();
export function setMonitors(packed: Float32Array): void {
  monitors.clear();
  for (let i = 0; i + 4 < packed.length; i += ENTRY)
    monitors.set(packed[i], [packed[i + 1], packed[i + 2], packed[i + 3], packed[i + 4]]);
}
export const monitorOf = (id: number | undefined): number[] | undefined =>
  id === undefined ? undefined : monitors.get(id);
/** Every block's monitor, by block id. */
export const allMonitors = (): ReadonlyMap<number, number[]> => monitors;
/** The Gates the engine reports open (CHG-0032: monitor [open, …]), for the stage to draw faded. */
export function openGateIds(packed: Float32Array): number[] {
  const out: number[] = [];
  for (let i = 0; i + 4 < packed.length; i += ENTRY) {
    if (packed[i + 1] !== 1) continue;
    const id = packed[i];
    if (App.Blocks.find((block) => block.Id === id)?.def.id === 'power.gate') out.push(id);
  }
  return out;
}
