// v1 objects the ported code leaves untyped, as the tests read them (casts in page code).
import type { V1Block } from '../../../web/src/v1ui/blocks.ts';

/** A v1 block with its params read as unknown values (V1Block's are `any`). */
export type V1BlockView = Omit<V1Block, 'Params'> & { Params: Record<string, unknown> };

/** MessagePanel's private message (v1 MessagePanel._Value): what the bar says. */
export interface MessagePanelText {
  Open: boolean;
  _Value?: { string?: string };
}

/** The tour's text (v1 Tutorial.Text, loaded from JSON). */
export interface TutorialText {
  Scenes: { Intro: string }[];
}
