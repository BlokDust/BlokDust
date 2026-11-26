// The Touchpad's pads (CHG-0019, UI-0010).
import { type PadHost, padNotes } from '../../v1ui/touchpadPanel.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { send } from '../model/engineLink.ts';
import { typeIndex } from '../model/patchModel.ts';

/** Browser-test hooks. */
declare global {
  interface Window {
    __bd_pads: typeof padNotes;
  }
}

// The Touchpad's pads (CHG-0019, UI-0010): a pointer on a pad plays it and is the pads' until
// it lifts, never v1's pointer or an extra finger. Notes go to that Touchpad; a slide is a bend.
export let TOUCHPAD_TYPE!: number;

export let padHost!: PadHost;

export function init(): void {
  TOUCHPAD_TYPE = typeIndex('input.touchpad');
  padHost = {
    note: (block, note, on) =>
      send([
        {
          type: on ? CommandType.NoteOn : CommandType.NoteOff,
          id: block,
          blockType: TOUCHPAD_TYPE,
          param: note,
          value: on ? 1 : 0,
          x: 0,
        },
      ]),
    bend: (block, note, semitones) =>
      send([
        {
          type: CommandType.NoteExpression,
          id: block,
          blockType: TOUCHPAD_TYPE,
          param: note,
          x: 0,
          y: 0,
          value: semitones,
        },
      ]),
  };
  window.__bd_pads = padNotes;
}
