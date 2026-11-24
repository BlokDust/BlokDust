import { embedId, juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { deleteBlocks } from '../editing/deleteBlocks.ts';
import { endPlacing, placing } from '../editing/placing.ts';
import { redo, undo } from '../editing/undoRedo.ts';
import { pushUndo, redoStack, uidsOf, undoStack } from '../editing/undoSteps.ts';
import { copyBlocks, selection, selectionSize, setSelection } from './selection.ts';
import { standalone } from '../model/engineLink.ts';
import { labels, model, selLabels, selectedLabels } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';
import { quickSave } from '../share/ownLink.ts';
import { makeStage } from '../stage/makeStage.ts';
import { copyLabels } from '../stageBlock/fillStage.ts';
import { exitStage } from '../stageBlock/lookInside.ts';

export function init(): void {
  // v1 keyboard shortcut: delete the selected block. Esc drops an Insert being placed; Cmd/Ctrl+Z takes the last
  // Insert out again (owner, 2026-11-10: one step).
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    // Cmd/Ctrl+S (SPEC-SHARING-BACKEND R18): quick save, also while typing; never the browser's "Save page". In a DAW
    // it is the DAW's Save (which keeps the plugin's patch in the project); the standalone app opens Patches › SAVE.
    if (
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      !e.altKey &&
      e.key.toLowerCase() === 's' &&
      !embedId
    ) {
      if (juce && !standalone) return;
      e.preventDefault();
      if (!e.repeat) void quickSave();
      return;
    }
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      if (e.key === 'Escape' && placing) {
        e.preventDefault();
        endPlacing(true);
        return;
      }
      if (e.key === 'Escape' && inside && !scene.PatchesPanel.Open && !scene.SettingsPanel.Open) {
        e.preventDefault();
        exitStage();
        return;
      }
      // Cmd/Ctrl+G: the selected blocks go inside a new Stage block where they were (CHG-0021).
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'g' &&
        selection.size > 0 &&
        !inside &&
        !juce
      ) {
        e.preventDefault();
        makeStage();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'z' &&
        (placing || undoStack.length)
      ) {
        e.preventDefault();
        if (placing) endPlacing(true);
        else undo();
        return;
      }
      // Redo: Cmd/Ctrl+Shift+Z, or Ctrl+Y (Windows).
      if (
        (e.metaKey || e.ctrlKey) &&
        ((e.shiftKey && e.key.toLowerCase() === 'z') ||
          (!e.shiftKey && e.key.toLowerCase() === 'y')) &&
        !placing &&
        redoStack.length
      ) {
        e.preventDefault();
        redo();
        return;
      }
    }
    if (
      tag !== 'INPUT' &&
      tag !== 'TEXTAREA' &&
      !scene.PatchesPanel.Open &&
      !scene.SettingsPanel.Open &&
      !scene.SoundcloudPanel.Open
    ) {
      const mod = e.metaKey || e.ctrlKey,
        k = e.key.toLowerCase();
      // Space: the power switch (web; in a DAW, Space is the transport's).
      if (e.code === 'Space' && !mod && !e.repeat && !juce) {
        e.preventDefault();
        scene.setWorldPower(!scene.worldPower);
        return;
      }
      if (e.key === 'Escape' && selectionSize()) {
        e.preventDefault();
        setSelection([]);
        return;
      }
      if (mod && !e.shiftKey && k === 'a') {
        e.preventDefault();
        setSelection(
          model.keys(),
          labels.map((l) => l.id),
        );
        scene.OptionsPanel.Close();
        return;
      }
      if (mod && !e.shiftKey && k === 'd' && selectionSize()) {
        e.preventDefault();
        const made = copyBlocks([...selection], 2, 2),
          madeLabels = copyLabels(selLabels(), 2, 2);
        pushUndo({ kind: 'add', uids: uidsOf(made.values()), labels: madeLabels });
        setSelection(made.values(), madeLabels);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectionSize()) {
        e.preventDefault();
        deleteBlocks([...selection], undefined, [...selectedLabels]);
        scene.select(null);
        scene.OptionsPanel.Close();
        stage.redraw();
        return;
      }
    }
    if (
      (e.key === 'Delete' || e.key === 'Backspace') &&
      scene.SelectedBlock &&
      tag !== 'INPUT' &&
      tag !== 'TEXTAREA'
    ) {
      deleteBlocks([scene.SelectedBlock.Id]);
      scene.select(null);
      scene.OptionsPanel.Close();
    }
  });
}
