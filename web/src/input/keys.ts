// Computer keyboard → notes, with v1's active map (PianoKeyboardManager.ts, `PianoKeyboardMap`).
// Arrow up/down (and numpad +/−) shift the octave, as v1's 1000/1001 codes did.
export const V1_KEY_NOTES: Readonly<Partial<Record<string, number>>> = {
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
/** Typing in a text field (Share title, sample search) is text, not notes (v1's TypingManager). */
const isTextField = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'SELECT' ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable);
export const OCTAVE_UP = new Set(['ArrowUp', 'NumpadAdd']);
export const OCTAVE_DOWN = new Set(['ArrowDown', 'NumpadSubtract']);

/** A Web MIDI input as the MIDI Input block's device option lists it. */
export interface MidiDevice {
  id: string;
  name: string;
}
/** Wires the keyboard (notes) and Web MIDI (raw messages and their device; the app runs the MPE
 * parsers, PLUGIN-0004); `devices` reports inputs as they change; returns a disposer. */
export function attachNoteInputs(on: {
  key: (note: number, down: boolean) => void;
  /** Plugin: note keys are BlokDust's (not passed on to the DAW) while this returns true. */
  captureKeys?: () => boolean;
  /** Standalone app: every plain key outside a text field is BlokDust's (macOS plays its alert
   * sound for a key the page passes on and nobody takes). */
  captureAll?: () => boolean;
  midi: (status: number, d1: number, d2: number, device: MidiDevice) => void;
  devices?: (list: MidiDevice[]) => void;
  /** Plugin: called with a function that ends every held note, for the editor's "keys lost"
   * message. */
  onReleaseAll?: (releaseAll: () => void) => void;
}) {
  let octave = 0;
  const held = new Map<string, number>();
  const down = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || isTextField(event.target)) return;
    const keyNote = V1_KEY_NOTES[event.code];
    // A held key repeats: the repeats are cancelled like the first press, or each one is passed on
    // (an alert sound each).
    if (on.captureAll?.() || (keyNote !== undefined && on.captureKeys?.())) event.preventDefault();
    if (event.repeat) return;
    if (OCTAVE_UP.has(event.code)) {
      octave = Math.min(3, octave + 1);
      return;
    }
    if (OCTAVE_DOWN.has(event.code)) {
      octave = Math.max(-3, octave - 1);
      return;
    }
    if (keyNote === undefined) return;
    const note = keyNote + 12 * octave;
    held.set(event.code, note);
    on.key(note, true);
  };
  const up = (event: KeyboardEvent) => {
    if (
      !event.metaKey &&
      !event.ctrlKey &&
      (on.captureAll?.() || (V1_KEY_NOTES[event.code] !== undefined && on.captureKeys?.()))
    ) {
      if (!isTextField(event.target)) event.preventDefault();
    }
    const note = held.get(event.code);
    if (note === undefined) return;
    held.delete(event.code);
    on.key(note, false);
  };
  // Switching tab or app while holding a key: the page never sees its key-up, so every held note
  // ends here (owner).
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
  const handler = (input: MIDIInput) => (messageEvent: MIDIMessageEvent) => {
    const bytes = messageEvent.data;
    // channel messages only
    if (!bytes || bytes.length < 2 || bytes[0] < 0x80 || bytes[0] >= 0xf0) return;
    on.midi(bytes[0], bytes[1], bytes.length > 2 ? bytes[2] : 0, {
      id: input.id,
      name: input.name ?? input.id,
    });
  };
  // Safari has no Web MIDI.
  if ('requestMIDIAccess' in navigator)
    navigator
      .requestMIDIAccess()
      .then((access) => {
        midiAccess = access;
        const bind = () => {
          access.inputs.forEach((input) => {
            input.onmidimessage = handler(input);
          });
          on.devices?.(
            [...access.inputs.values()].map((input) => ({
              id: input.id,
              name: input.name ?? input.id,
            })),
          );
        };
        bind();
        access.onstatechange = bind;
      })
      .catch(() => {
        /* no MIDI permission or support: keyboard still works */
      });
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', releaseAll);
    document.removeEventListener('visibilitychange', hidden);
    midiAccess?.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
  };
}
