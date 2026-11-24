// The FEEDBACK panel and what it reports about the system (CHG-0036, CHG-0041).
import { openAccountSettings } from '../scene/hostParts.ts';
import { SupportClient } from '../../support/client.ts';
import { FeedbackPanel } from '../../support/panel.ts';
import { App } from '../../v1ui/shim.ts';
import * as gallery from '../../gallery/client.ts';
import { embedId, juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { toPatch } from '../model/patchModel.ts';
import { accountPage, credit } from '../stage/corners.ts';

export const hostSystem: Record<string, unknown> = {};

export let supportClient!: SupportClient | null;

// FEEDBACK's REPORT A PATCH (CHG-0041): the gallery patch on the stage that isn't yours; the gallery's moderation.
export let feedbackPanel!: FeedbackPanel | null;

export function init(): void {
  juce?.addEventListener('bd_supportSystem', (value: Record<string, unknown>) => {
    Object.assign(hostSystem, value);
  });
  supportClient = !embedId
    ? new SupportClient({
        patch: toPatch,
        plugin: !!juce,
        system: () => ({ sampleRate: App.Audio.sampleRate, ...hostSystem }),
      })
    : null;
  feedbackPanel = supportClient
    ? new FeedbackPanel(
        supportClient,
        () => {
          stage.redraw();
        },
        {
          target: () =>
            credit?.published ? { id: credit.id, title: credit.title, by: credit.by } : null,
          signedIn: () => !!accountPage()?.Account,
          signIn: () => {
            openAccountSettings();
          },
          report: async (id, reason) => {
            await gallery.report(id, reason);
          },
        },
      )
    : null;
}
