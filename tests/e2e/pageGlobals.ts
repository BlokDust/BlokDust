// What the browser tests read and set on the page's window. The app declares its own test hooks
// next to the code that sets them; importing those modules' types makes them visible here.
/// <reference types="../../web/node_modules/vite/client" />
import type {} from '../../web/src/app/testing/probe.ts';
import type {} from '../../web/src/app/input/selection.ts';
import type {} from '../../web/src/app/input/notes.ts';
import type {} from '../../web/src/app/input/extraFingers.ts';
import type {} from '../../web/src/app/input/touchpad.ts';
import type {} from '../../web/src/app/samples/useSample.ts';
import type {} from '../../web/src/app/editing/placing.ts';
import type {} from '../../web/src/app/patchFiles/openPatch.ts';
import type {} from '../../web/src/app/stageBlock/fillStage.ts';
import type {} from '../../web/src/patch/site.ts';
import type { Command } from '../../web/src/engine/wasmEngine.ts';

/** The value of a bd_commands message the page sends the plugin's processor. */
export interface CommandsMessage {
  commands: Command[];
}

/** A fake Web MIDI input: tests call its handler as a device would. */
export interface FakeMidiInput {
  id: string;
  name: string;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
}

/** A canvas text call the tests recorded, with where it was drawn. */
export interface DrawnText {
  t: string;
  x: number;
  y: number;
}

/** What the Support page drew, recorded while it drew (support-connect-spacing). */
export interface SupportDrawing {
  rule: number;
  intro: number;
  message: number;
  bar?: { x: number; y: number; w: number; h: number };
  separator?: { top: number; height: number };
  glyphBottom?: number;
}

/** The options a page passed to the File System Access save picker. */
export interface SavePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}

declare global {
  interface Window {
    /** Messages the page sent to the fake JUCE backend. */
    __sent?: { id: string; v: unknown }[];
    /** Deliver a message from the fake JUCE backend to the page. */
    __fire?: (id: string, value: unknown) => void;
    /** Text the page drew on its canvases, in order. */
    __texts?: string[];
    __texts2?: Omit<DrawnText, 'y'>[];
    __texts3?: DrawnText[];
    /** URLs the page opened (window.open). */
    __opened?: string[];
    __prevented?: boolean | null;
    __gaps?: number[];
    __moved?: number;
    __downAt?: number;
    __title?: number[];
    __ctx?: AudioContext;
    __session?: string[];
    __written?: string[];
    __opts?: SavePickerOptions;
    __picked?: number[];
    __unclipped?: string[];
    __shared?: unknown;
    __seenBeforePatch?: number;
    __fakeMidi?: Map<string, FakeMidiInput>;
    __supportDrawing?: SupportDrawing;
    /** The File System Access save picker (Chromium); tests replace or remove it. */
    showSaveFilePicker?: (options?: SavePickerOptions) => Promise<unknown>;
  }
}
