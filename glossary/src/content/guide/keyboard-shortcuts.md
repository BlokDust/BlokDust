---
title: Keyboard Shortcuts
description: Play notes, edit patches and move around the stage with keyboard shortcuts and touchscreen gestures.
route: guide/keyboard-shortcuts
artwork: computer-keyboard.html
shortcuts:
  - title: Editing a patch
    rows:
      - title: Add to selection
        keys: [[Shift, Click]]
        description: Shift-click a block or label to add it to the selection. Shift-click it again to remove it.
      - title: Box select
        keys: [[Shift, Drag]]
        description: Drag from empty space to draw a box and add everything inside it to the selection. On a touchscreen, press and hold on empty space, then drag to draw the box.
      - title: Select all
        keys: [[Cmd/Ctrl, A]]
        description: Selects all blocks and labels on the current stage.
      - title: Clear selection
        keys: [[Esc]]
        description: Clears the current selection. On a touchscreen, tap empty space.
      - title: Duplicate
        keys: [[Cmd/Ctrl, D]]
        description: Makes a copy of the selected blocks and labels.
      - title: Duplicate and place
        keys: [[Option/Alt, Drag]]
        description: Copies a block or the selected group and lets you place the copy as you drag.
      - title: Delete
        keys: [[Delete], [Backspace]]
        description: Removes selected blocks or labels, or the block whose options are open. On a touchscreen, drag the block or selection to the trash.
      - title: Undo
        keys: [[Cmd/Ctrl, Z]]
        description: Reverses the last edit.
      - title: Redo
        keys: [[Cmd/Ctrl, Shift, Z], [Cmd/Ctrl, Y]]
        description: Reapplies the last edit you undid.
      - title: Cancel insert
        keys: [[Esc], [Cmd/Ctrl, Z]]
        description: Cancels an Insert while you’re placing it. Click to place the blocks with a mouse, or drag them into position and lift your finger on a touchscreen.
      - title: Make Stage
        keys: [[Cmd/Ctrl, G]]
        description: Puts selected blocks inside a new Stage in the browser. You can also press Make Stage when it appears after selecting blocks.
      - title: Exit Stage
        keys: [[Esc]]
        description: Returns from an open Stage. On a touchscreen, tap its close button or tap outside the Stage window.
      - title: Finish label
        keys: [[Enter]]
        description: Keeps your changes when editing a label.
      - title: Cancel label edit
        keys: [[Esc]]
        description: Leaves the label as it was before you started editing it.
  - title: Saving and searching
    rows:
      - title: Save patch
        keys: [[Cmd/Ctrl, S]]
        description: Updates your saved patch on the web. If it hasn’t been saved yet, it opens Patches → Save, as it does in the standalone app. In a DAW, use the host’s Save command.
      - title: Run search
        keys: [[Enter]]
        description: Runs a search from the Gallery or Freesound search field.
      - title: Confirm text
        keys: [[Enter]]
        description: Finishes editing the patch title or submits the account name field.
  - title: Playing
    rows:
      - title: Toggle power
        keys: [[Space]]
        description: Toggles power for the whole patch in the browser. On a touchscreen, tap the power switch at the bottom of the stage. In a DAW, Space controls the host’s transport.
      - title: Lower piano keys
        piano: [[Z, S], [X, D], [C], [V, G], [B, H], [N, J], [M], [',', L], ['.', ';'], ['/']]
        description: Plays C3 to E4 at the default octave. The black and white keys show how the two typing rows fit together on a QWERTY keyboard.
      - title: Upper piano keys
        piano: [[Q, '2'], [W, '3'], [E], [R, '5'], [T, '6'], [Y, '7'], [U], [I, '9'], [O, '0'], [P], ['[', '='], [']']]
        description: Plays C4 to G5 at the default octave. On a touchscreen, connect a Touchpad, open its options and play the pads.
      - title: Raise octave
        keys: [[Up Arrow], [Numpad +]]
        description: Moves the computer keyboard notes up one octave. On a touchscreen, use the Touchpad’s Octave control.
      - title: Lower octave
        keys: [[Down Arrow], [Numpad −]]
        description: Moves the computer keyboard notes down one octave.
  - title: Fine control and zoom
    rows:
      - title: Fine envelope adjustment
        keys: [[Shift, Drag]]
        description: Slows down the handle while you drag it on the Envelope graph.
      - title: Pan waveform
        keys: [[Shift, Scroll]]
        description: Moves sideways along a zoomed waveform. You can also swipe sideways on a trackpad or slide the midpoint of a two-finger gesture on a touchscreen.
      - title: Zoom
        keys: [[Scroll], [Pinch]]
        description: Zooms in and out over the stage or a waveform. Use the mouse wheel, or pinch with two fingers on a touchscreen or trackpad.
---

Use **Cmd** and **Option** on a Mac, or **Ctrl** and **Alt** on Windows. If you’re using BlokDust in a DAW, some shortcuts belong to the host. To play notes, add a [Computer Keyboard](/blocks/computer-keyboard/) or [Touchpad](/blocks/touchpad/) block to your patch.
