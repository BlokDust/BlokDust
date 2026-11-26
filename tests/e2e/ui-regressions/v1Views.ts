// v1 objects the ported code leaves untyped, as the tests read them (casts in page code).
import type { V1Block } from '../../../web/src/v1ui/blocks/v1Block.ts';
import type { Splash } from '../../../web/src/v1ui/ported/Splash.ts';
import type { PatchesHost } from '../../../web/src/v1ui/patches/hosts.ts';
import type { FreesoundSound } from '../../../web/src/patch/samples.ts';

/** A v1 block's options form (v1 UpdateOptionsForm's result). */
export interface V1OptionsForm {
  name?: string;
  parameters?: { type: string; name: string; setting?: string }[];
}

/** A v1 block with its params read as unknown values (V1Block's are `any`); LoadTrack takes the
 * track fields it reads (v1's track is a SoundCloudTrack). */
export type V1BlockView = Omit<V1Block, 'Params' | 'OptionsForm' | 'LoadTrack'> & {
  Params: Record<string, unknown>;
  OptionsForm: V1OptionsForm | null;
  LoadTrack(track: {
    TitleShort: string;
    UserShort: string;
    Permalink: string;
    Sound: FreesoundSound;
  }): void;
};

/** MessagePanel's private message (v1 MessagePanel._Value): what the bar says. */
export interface MessagePanelText {
  Open: boolean;
  _Value?: { string?: string; buttonEvent?: () => void };
}

/** The tour's text (v1 Tutorial.Text, loaded from JSON). */
export interface TutorialText {
  Scenes: { Intro: string }[];
}

/** The scene's private splash (V1Scene.splash): the start screen while it shows. */
export interface SceneSplash {
  splash: Splash | null;
}

/** SettingsPanel's private open tab (v1 SettingsPanel._OpenTab). */
export interface SettingsOpenTab {
  _OpenTab: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** PatchesPanel's private layout and host (web/src/v1ui/patches/), read by layout tests. */
export interface PatchesPanelInternals {
  host: PatchesHost;
  pageDy: number[];
  rowH: number;
  rowGap: number;
  videoOn: boolean;
  openLayout(): { rule: number; top: number; bottom: number };
  openRowY(row: number): number;
  openMaxScroll(): number;
  galleryLayout(): { rule: number; sortY: number };
  galleryWindow(): { top: number; bottom: number; clip: number };
  gallerySwitch(): Box;
  videoSwitch(): Box;
  backArrow(): { x: number; y: number };
  mainAction(): { kind: 'save' | 'video' | null; label: string; off: boolean };
}

/** The scene's private UPLOAD FILE button box (V1Scene.fileButtonRect). */
export interface SceneFileButton {
  fileButtonRect(): Box & { label: string };
}

type ReleaseFile = { file: string; url: string; sha256: string; bytes: number } | null;

/** What Release 1 adds to v1's Settings panel for tests (v1ui/scene.ts): centres in CSS px. */
export interface SettingsFooter {
  footerLinks(): { label: string; x: number; y: number }[];
  tourButton(): { x: number; y: number } | null;
  downloadButtons(): { key: string; x: number; y: number; url: string | null }[];
  setRelease(release: { version: string | null; macos: ReleaseFile; windows: ReleaseFile }): void;
  peoplePhone(): { icon: number[]; text: number[]; url: string }[] | null;
  guideButton(): {
    x: number;
    y: number;
    w: number;
    h: number;
    lineY: number;
    url: string;
  } | null;
}

/** v1's DisplayObject canvas the Settings panel draws on (untyped in ported code). */
export interface DrawTo {
  Height: number;
}

/** The Filter's parametric graph option: its drawn curve. */
export interface ParametricOption {
  LineGain: number[];
  Smoothness: number;
}
