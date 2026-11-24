import { type VideoChoice, type VideoProgressInfo } from '../../v1ui/patches/hosts.ts';
import { toPatch } from '../model/toPatch.ts';
import { PUBLIC_SITE, type FreesoundRef, type SampleRef } from '../../patch/samples.ts';
import { type Credit } from '../../video/frame.ts';
import { type PatchSample, startSource } from '../../video/sources.ts';
import { engineModule } from '../../audio/engineNode.ts';
import { videoFileName } from '../../video/share.ts';
import { theme } from '../boot/theme.ts';
import { engineCommands } from '../engine/engineCommands.ts';
import { engine } from '../model/engineLink.ts';
import { labels, model, seed } from '../model/patchModel.ts';
import { innerIds, innerSamples, inside } from '../model/stageWorlds.ts';
import { shareLink } from '../model/unsavedChanges.ts';
import { samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';

// ---- video export (CHG-0022, SPEC-SHARING-VIDEO-EXPORT) ----
export const videoTitle = () => scene.PatchesPanel.Title.trim() || 'Untitled';

export const videoLink = () => shareLink?.url ?? PUBLIC_SITE;

/** R8: every Freesound sound the patch uses (CC-BY asks for credit; CC0 gets it too). */
export function videoCredits(): Credit[] {
  return Object.values(toPatch().refs ?? {})
    .filter((r): r is FreesoundRef => (r as SampleRef).provider === 'freesound')
    .map((ref) => ({ name: ref.name, user: ref.username, license: ref.license }));
}

/** FROM START: what the engine is built from now, and every sample it would be given (outer world and Stages). */
export function startSamples(): PatchSample[] {
  const out: PatchSample[] = [];
  for (const [id, buffer] of samples) if (model.has(id)) out.push({ id, stage: 0, buffer });
  for (const [id, b] of model)
    if (b.type === 'source.stage')
      for (const [uid, buffer] of innerSamples.get(b.uid) ?? []) {
        const iid = innerIds.get(b.uid)?.ids[uid];
        if (iid !== undefined) out.push({ id: iid, stage: id, buffer });
      }
  return out;
}

export async function makeVideoFile(
  choice: VideoChoice,
  progress: (videoProgressInfo: VideoProgressInfo) => void,
  signal: AbortSignal,
): Promise<File> {
  if (!engine) throw new Error('Press start first.');
  // From the beginning, as the patch plays when it has just loaded (owner, 2026-11-15): the whole patch, so not
  // while looking into a Stage.
  if (inside) throw new Error('Close the Stage first: the video plays the whole patch.');
  const sampleRate = engine.node.context.sampleRate;
  const source = startSource(sampleRate, seed, engineCommands(), startSamples());
  const { makeVideo } = await import('../../video/makeVideo.ts');
  const blob = await makeVideo(
    await engineModule(),
    {
      source,
      from: 0,
      to: Math.round(choice.seconds * sampleRate),
      shape: choice.shape,
      theme,
      labels: labels.map((label) => ({ ...label })),
      card: { title: videoTitle(), link: videoLink(), credits: videoCredits() },
    },
    progress,
    signal,
  );
  return new File([blob], videoFileName(videoTitle()), { type: 'video/mp4' });
}
