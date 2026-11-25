// v1 objects the ported code leaves untyped, as the tests read them (casts in page code).
import type { V1Block } from '../../../web/src/v1ui/blocks.ts';

/** A v1 block's options form (v1 UpdateOptionsForm's result). */
export interface V1OptionsForm {
  name?: string;
  parameters?: { type: string; name: string; setting?: string }[];
}

/** A v1 block with its params read as unknown values (V1Block's are `any`). */
export type V1BlockView = Omit<V1Block, 'Params' | 'OptionsForm'> & {
  Params: Record<string, unknown>;
  OptionsForm: V1OptionsForm | null;
};

/** MessagePanel's private message (v1 MessagePanel._Value): what the bar says. */
export interface MessagePanelText {
  Open: boolean;
  _Value?: { string?: string };
}

/** The tour's text (v1 Tutorial.Text, loaded from JSON). */
export interface TutorialText {
  Scenes: { Intro: string }[];
}
