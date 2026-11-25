// LFO targets (AUDIO-0003): what an LFO can move on the blocks connected to it, and the open panel's
// sliders following the LFO while it moves them.
import { App, sceneIfMade } from '../shim.ts';
import { isSelector } from '../selectorOption.ts';
import type { V1Block } from '../blocks/v1Block.ts';
import type { V2OptionsPanel } from '../optionsTypes.ts';
import { isLiveRow, isMeterRow } from './liveRows.ts';
import { CONVERT, KEYS } from './formRows.ts';
import { allMonitors } from './monitors.ts';

export interface LfoTarget {
  id: number;
  param: string;
  label: string;
}
interface Modulatable {
  param: string;
  label: string;
}
const blockById = (id: number) => App.Blocks.find((block) => block.Id === id);

/** The params of `block` an LFO can move: the sliders its own panel shows (with v1's names), not
 * its carousels or switches; plus the Filter's three, which its panel shows as a graph. */
function modulatable(block: V1Block): Modulatable[] {
  const def = block.def,
    out: Modulatable[] = [];
  if (def.id === 'fx.filter')
    return [
      { param: 'frequency', label: 'Frequency' },
      { param: 'gain', label: 'Gain' },
      { param: 'Q', label: 'Width' },
    ];
  // CHG-0040: Random Note's bars and range ends (its Key is a slider row); a Chord's Key only.
  if (def.id === 'fx.random-note')
    return [
      ...KEYS.map((key, i) => ({ param: `w${i}`, label: `Weight ${key}` })),
      { param: 'key', label: 'Key' },
      { param: 'low', label: 'Range Low' },
      { param: 'high', label: 'Range High' },
    ];
  if (def.id === 'fx.chord') return [{ param: 'key', label: 'Key' }];
  block.UpdateOptionsForm();
  for (const row of block.OptionsForm?.parameters ?? []) {
    const liveOnly = isLiveRow(row.setting) && !isMeterRow(row.setting);
    if (row.type !== 'slider' || isSelector(row.setting) || liveOnly) continue;
    if (isMeterRow(row.setting)) {
      if (!out.some((entry) => entry.param === 'threshold'))
        out.push({ param: 'threshold', label: 'Threshold' });
      continue;
    }
    const param = CONVERT[row.setting]?.param ?? row.setting,
      manifest = def.params.find((entry) => entry.key === param);
    if (manifest && manifest.ui.transform !== 'None' && !out.some((entry) => entry.param === param))
      out.push({ param, label: row.name });
  }
  return out;
}
/** Every param an LFO can move, over the blocks connected to it. */
export function lfoTargets(lfo: V1Block): LfoTarget[] {
  const out: LfoTarget[] = [];
  for (const id of sceneIfMade()?.host.connectedIds(lfo.Id) ?? []) {
    const block = blockById(id);
    if (!block) continue;
    for (const entry of modulatable(block))
      out.push({
        id,
        param: entry.param,
        label: `${block.BlockName} · ${entry.label}`.toUpperCase(),
      });
  }
  return out;
}
/** The LFO's Target carousel moved to entry `index` (0 = none). */
export function setLfoTarget(lfo: V1Block, index: number): void {
  const target = (lfo.LfoTargets ?? [])[Math.round(index) - 1] as LfoTarget | undefined;
  App.MainScene.host.setTarget(lfo.Id, target ? { id: target.id, param: target.param } : null);
}

/** A param's engine value as its slider shows it (the inverse of SetParam's mapping), or null. */
function sliderValue(
  setting: string,
  transform: V1Block['def']['params'][number]['ui'],
  value: number,
): number | null {
  const converted = CONVERT[setting];
  if (converted) return converted.from ? converted.from(value) : null;
  if (transform.transform === 'SubtractFrom') return transform.k - value;
  if (transform.transform === 'Minus') return value + transform.k;
  if (transform.transform === 'Divide') return value * transform.k;
  return value;
}

/** While an LFO moves a param of the open block, its slider follows (the engine's value now). What
 * the slider is set to, and what a patch saves, is untouched. Returns true while any follows. */
let following = false;
export function followLfos(panel: V2OptionsPanel): boolean {
  const block = panel.SelectedBlock;
  let anyFollows = false;
  if (block && panel.Scale === 1) {
    for (const [id, monitor] of allMonitors()) {
      if (monitor[0] !== block.Id || blockById(id)?.def.id !== 'fx.lfo') continue;
      const param = block.def.params[Math.round(monitor[1])] as
        V1Block['def']['params'][number] | undefined;
      if (!param) continue;
      for (const option of panel.Options) {
        const setting = CONVERT[option.Setting]?.param ?? option.Setting;
        if (option.Type !== 'slider' || option.Selected || setting !== param.key) continue;
        const shown = sliderValue(option.Setting, param.ui, monitor[2]);
        if (shown === null) continue;
        const value = Math.max(option.Min, Math.min(option.Max, shown));
        option.Value = value;
        option.Position.x = option.Log
          ? panel.logPosition(0, panel.Range, option.Min, option.Max, value)
          : panel.linPosition(0, panel.Range, option.Min, option.Max, value);
        option.Followed = value;
        anyFollows = true;
      }
    }
    if (anyFollows) panel._DrawReady = true;
    else if (following) block.RefreshOptionsPanel(); // back to where it is set
  }
  following = anyFollows;
  return anyFollows;
}
