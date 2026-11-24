// Computer keyboard → notes, using v1's active map (Core/Inputs/PianoKeyboardManager.ts, `PianoKeyboardMap`).
// Arrow up/down (and numpad +/−) shift the octave, as v1's 1000/1001 codes did.
export const V1_KEY_NOTES: Readonly<Record<string, number>> = {
  KeyZ: 48,
  KeyS: 49,
  KeyX: 50,
  KeyD: 51,
  KeyC: 52,
  KeyV: 53,
  KeyG: 54,
  KeyB: 55,
  KeyH: 56,
  KeyN: 57,
  KeyJ: 58,
  KeyM: 59,
  Comma: 60,
  KeyL: 61,
  Period: 62,
  Semicolon: 63,
  Slash: 64,
  KeyQ: 60,
  Digit2: 61,
  KeyW: 62,
  Digit3: 63,
  KeyE: 64,
  KeyR: 65,
  Digit5: 66,
  KeyT: 67,
  Digit6: 68,
  KeyY: 69,
  Digit7: 70,
  KeyU: 71,
  KeyI: 72,
  Digit9: 73,
  KeyO: 74,
  Digit0: 75,
  KeyP: 76,
  BracketLeft: 77,
  Equal: 78,
  BracketRight: 79,
};
export const OCTAVE_UP = new Set(['ArrowUp', 'NumpadAdd']);
export const OCTAVE_DOWN = new Set(['ArrowDown', 'NumpadSubtract']);

/** Wire keyboard + Web MIDI to note callbacks. Returns a disposer. */
/** A Web MIDI input as the MIDI Input block's device option lists it. */
export interface MidiDevice {
  id: string;
  name: string;
}
/** Wire the computer keyboard (notes) and Web MIDI (raw messages + the device they came from; the app runs each MIDI
 * Input block's MPE parser, PLUGIN-0004). `devices` reports the connected inputs whenever they change. */
export function attachNoteInputs(on: {
  key: (note: number, down: boolean) => void;
  /** Plugin: note keys are BlokDust's (not passed on to the DAW) while this returns true. */
  captureKeys?: () => boolean;
  /** Standalone app: every plain key outside a text field is BlokDust's. The web view passes on any key the page
   * doesn't cancel, and macOS answers a key nobody takes with its alert sound (owner, 2026-11-13). */
  captureAll?: () => boolean;
  midi: (status: number, d1: number, d2: number, device: MidiDevice) => void;
  devices?: (list: MidiDevice[]) => void;
  /** Plugin: called with a function that ends every held note, for the editor's "keys lost" message. */
  onReleaseAll?: (releaseAll: () => void) => void;
}) {
  let octave = 0;
  const held = new Map<string, number>();
  const down = (e: KeyboardEvent) => {
    // Typing in a text field (Share title, sample search) is text, not notes: v1's TypingManager intent.
    const tag = (e.target as HTMLElement)?.tagName;
    if (
      e.metaKey ||
      e.ctrlKey ||
      tag === 'SELECT' ||
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      (e.target as HTMLElement)?.isContentEditable
    )
      return;
    const n = V1_KEY_NOTES[e.code];
    // A held key repeats: the repeats are cancelled like the first press, or each one is passed on (an alert sound each).
    if (on.captureAll?.() || (n !== undefined && on.captureKeys?.())) e.preventDefault();
    if (e.repeat) return;
    if (OCTAVE_UP.has(e.code)) {
      octave = Math.min(3, octave + 1);
      return;
    }
    if (OCTAVE_DOWN.has(e.code)) {
      octave = Math.max(-3, octave - 1);
      return;
    }
    if (n === undefined) return;
    const note = n + 12 * octave;
    held.set(e.code, note);
    on.key(note, true);
  };
  const up = (e: KeyboardEvent) => {
    if (
      !e.metaKey &&
      !e.ctrlKey &&
      (on.captureAll?.() || (V1_KEY_NOTES[e.code] !== undefined && on.captureKeys?.()))
    ) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag !== 'SELECT' &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        !(e.target as HTMLElement)?.isContentEditable
      )
        e.preventDefault();
    }
    const note = held.get(e.code);
    if (note === undefined) return;
    held.delete(e.code);
    on.key(note, false);
  };
  // Switching tab or app while holding a key: the page never sees its key-up, so every held note ends here (owner).
  const releaseAll = () => {
    for (const note of held.values()) on.key(note, false);
    held.clear();
  };
  const hidden = () => {
    if (document.visibilityState === 'hidden') releaseAll();
  };
  on.onReleaseAll?.(releaseAll);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', hidden);
  let midiAccess: MIDIAccess | null = null;
  const handler = (input: MIDIInput) => (e: MIDIMessageEvent) => {
    const d = e.data;
    if (!d || d.length < 2 || d[0] < 0x80 || d[0] >= 0xf0) return; // channel messages only
    on.midi(d[0], d[1], d.length > 2 ? d[2] : 0, { id: input.id, name: input.name ?? input.id });
  };
  navigator
    .requestMIDIAccess?.()
    .then((a) => {
      midiAccess = a;
      const bind = () => {
        a.inputs.forEach((i) => {
          i.onmidimessage = handler(i);
        });
        on.devices?.([...a.inputs.values()].map((i) => ({ id: i.id, name: i.name ?? i.id })));
      };
      bind();
      a.onstatechange = bind;
    })
    .catch(() => {
      /* no MIDI permission or support: keyboard still works */
    });
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', releaseAll);
    document.removeEventListener('visibilitychange', hidden);
    midiAccess?.inputs.forEach((i) => {
      i.onmidimessage = null;
    });
  };
}
