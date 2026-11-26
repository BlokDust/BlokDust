// The whole patch, as saved: the outer world with what is inside each Stage block (R7).
import type { Patch, PatchSource } from '../../patch/loadPatch.ts';
import { refs, seed, sources, tempo } from './patchModel.ts';
import { innerMacro, inside, macros, worldParts } from './stageWorlds.ts';
import { currentView } from './view.ts';

/** At most this many inserted sources are kept: older ones stay reachable through newer ones. */
export const SOURCES_MAX = 32;

/** The sources that still have blocks here, with only those blocks. */
export const liveSources = (ids: Set<string>) =>
  sources
    .map((source) => ({ ...source, blocks: source.blocks.filter((uid) => ids.has(uid)) }))
    .filter((source) => source.blocks.length)
    .slice(-SOURCES_MAX);

function isSource(item: unknown): item is PatchSource {
  const source = item as Partial<PatchSource> | null;
  return !!source && typeof source.id === 'string' && Array.isArray(source.blocks);
}

export const readSources = (list: unknown): PatchSource[] =>
  Array.isArray(list)
    ? (list as unknown[]).filter(isSource).map((source) => ({
        id: source.id,
        ...(typeof source.rev === 'number' ? { rev: source.rev } : {}),
        ...(typeof source.title === 'string' ? { title: source.title } : {}),
        ...(typeof source.by === 'string' ? { by: source.by } : {}),
        blocks: source.blocks.filter((uid) => typeof uid === 'string'),
      }))
    : [];

/** Looking into a Stage, the inner world on screen is folded into its macro first. */
export const toPatch = (): Patch => {
  if (inside) macros.set(inside.stageUid, innerMacro());
  const world = inside
    ? worldParts(inside.outer.model, inside.outer.connectionOrder, inside.outer.labels)
    : worldParts();
  const stageUids = new Set(
    world.blocks.filter((block) => block.type === 'source.stage').map((block) => block.id),
  );
  const stageMacros = [...macros.values()].filter(
    (macro) => stageUids.has(macro.block) && (macro.blocks.length || macro.labels?.length),
  );
  const tracksUsed = new Set(
    [...world.blocks, ...stageMacros.flatMap((macro) => macro.blocks)]
      .map((block) => block.params?.track)
      .filter((track): track is string => typeof track === 'string'),
  );
  const usedRefs = Object.fromEntries([...refs].filter(([track]) => tracksUsed.has(track)));
  const blockUids = world.blocks.map((block) => block.id).filter((uid): uid is string => !!uid);
  const usedSources = liveSources(new Set(blockUids));
  return {
    format: 'blokdust.patch',
    version: 2,
    seed,
    ...(tempo !== undefined ? { tempo } : {}),
    blocks: world.blocks,
    ...(Object.keys(usedRefs).length ? { refs: usedRefs } : {}),
    ...(world.order.length ? { connectionOrder: world.order } : {}),
    ...(world.labels.length ? { labels: world.labels.map((label) => ({ ...label })) } : {}),
    ...(stageMacros.length ? { macros: stageMacros } : {}),
    ...(usedSources.length ? { sources: usedSources } : {}),
    view: inside ? inside.outer.view : currentView(),
  };
};
