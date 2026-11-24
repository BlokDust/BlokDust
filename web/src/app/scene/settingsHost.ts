// Settings and the header: theme, view, tempo, master volume, the world's power, a new patch.
import { analyticsAllowed, setAnalyticsAllowed, track } from '../../analytics/client.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { THEMES } from '../../generated/palettes.gen.ts';
import { saveSession } from '../../patch/share.ts';
import { setGuarded } from '../audio/microphone.ts';
import { embedId, juce, pluginStats, session, setSession } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { THEME_KEY, setTheme, theme } from '../boot/theme.ts';
import { removeBlock } from '../editing/deleteBlocks.ts';
import { endPlacing } from '../editing/placing.ts';
import { redoStack, undoStack } from '../editing/undoSteps.ts';
import { endLabelEdit } from '../labels/labels.ts';
import { changed } from '../model/autosave.ts';
import { sendRaw } from '../model/engineLink.ts';
import { labels, model, selectedLabels, setSources, setTempo, tempo } from '../model/patchModel.ts';
import { innerIds, innerSamples, inside, macros } from '../model/stageWorlds.ts';
import { setBaseline, setShareLink } from '../model/unsavedChanges.ts';
import { checkOwnDirty } from '../share/ownLink.ts';
import { setCredit } from '../stage/corners.ts';
import { setUiSync } from '../stage/overlays.ts';
import { leaveStage } from '../stageBlock/lookInside.ts';
import { feedbackPanel } from '../support/feedback.ts';
import type { SceneHostPart } from './hostParts.ts';

const DEFAULT_TEMPO = 120;

function chooseTheme(index: number): void {
  setTheme(THEMES[index] ?? THEMES[0]);
  stage.setTheme(theme);
  setUiSync(true);
  stage.redraw();
  if (embedId) return;
  try {
    localStorage.setItem(THEME_KEY, String(theme.index));
  } catch {
    /* private mode */
  }
}

/** v1 CreateNew ✓: every block goes, and the session with it (URL, share link, undo). */
function resetScene(): void {
  setGuarded(false); // a new patch is yours (CHG-0041)
  for (const id of [...model.keys()]) removeBlock(id);
  if (inside) leaveStage(false);
  // The old patch's particles go with it (SPEC-SIMULATION-POWER-AND-PARTICLES R1b).
  sendRaw([{ type: CommandType.Reset, id: 0 }]);
  labels.length = 0;
  selectedLabels.clear();
  endLabelEdit(false);
  macros.clear();
  innerIds.clear();
  innerSamples.clear();
  setSources([]);
  stage.setView(1, { x: 0, y: 0 });
  history.replaceState(null, '', location.pathname); // v1 AddressBarManager.StripURL
  setSession({ id: null, dirty: false });
  saveSession(session);
  setShareLink(null);
  setCredit(null);
  undoStack.length = 0;
  redoStack.length = 0;
  endPlacing(true);
  setBaseline();
  checkOwnDirty();
  track('patch_created', { from: 'reset' });
}

export function settingsHost(): SceneHostPart<
  | 'feedback'
  | 'usageStats'
  | 'setTheme'
  | 'themes'
  | 'setZoom'
  | 'setDrag'
  | 'tempo'
  | 'setTempo'
  | 'setMasterDb'
  | 'setWorldPower'
  | 'setPowerMode'
  | 'resetScene'
> {
  return {
    feedback: feedbackPanel ?? undefined,
    // Settings › About (SPEC-SHARING-USAGE-ANALYTICS R7): this browser's choice, or the plugin's.
    usageStats: pluginStats ?? {
      get: () => analyticsAllowed(),
      set: (on) => {
        setAnalyticsAllowed(on);
      },
    },
    setTheme: chooseTheme,
    themes: () => THEMES,
    setZoom: (zoom) => {
      stage.setView(zoom, stage.drag);
    },
    setDrag: (offset) => {
      stage.setView(stage.zoom, offset);
    },
    tempo: () => tempo ?? DEFAULT_TEMPO,
    setTempo: (bpm) => {
      setTempo(Math.max(40, Math.min(240, bpm)));
      sendRaw([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]);
      changed();
    },
    // Tone.Volume dB → gain is 2^(dB/6).
    setMasterDb: (decibels) => {
      sendRaw([
        { type: CommandType.SetMaster, id: 0, value: decibels <= -99 ? 0 : 2 ** (decibels / 6) },
      ]);
    },
    // The whole patch, every stage (owner).
    setWorldPower: (on) => {
      sendRaw([{ type: CommandType.WorldPower, id: 0, value: on ? 1 : 0 }]);
      stage.redraw();
    },
    setPowerMode: (mode) => {
      juce?.emitEvent('bd_powerMode', { mode });
      stage.redraw();
    },
    resetScene,
  };
}
