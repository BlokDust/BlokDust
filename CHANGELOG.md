# What's new in BlokDust 2

## Audio plug-ins
- **VST3 and Audio Unit plug-ins:** BlokDust runs as a software instrument in Ableton Live, Logic, REAPER, Bitwig,
  Cubase or FL Studio, on **macOS** and **Windows**.
- **BlokDust FX:** use BlokDust as an effect. An Audio In block brings your track's audio into the patch. In the
  instrument, a side-chain from your DAW feeds the Audio In block too.
- **Standalone app** for macOS and Windows.
- **Syncs with your DAW's tempo:** Emitters, Pulses, Lasers and Stereo Delays can sync to the tempo in musical
  divisions, and start and stop with the transport.
- **Automation:** right-click a slider to assign it to one of eight "Dust" controls. These can be automated in your
  DAW or learned to a MIDI controller knob.
- **Patches are saved** in your DAW projects, samples included, and can also be saved to files.
- **Drag audio in** from Finder, Explorer or your DAW, onto the stage directly to make a new Sample block.

## Playing
- **MPE compatible:** the MIDI Keyboard block has MPE settings for per-note pitch bend, pressure and slide from MPE
  controllers (ROLI, LinnStrument, Funputs and others).
- **MIDI device and channel:** the MIDI Keyboard block has options to choose MIDI channel in the plugin, and on the web to choose specific device.
- **Keyboards trigger Emitters and Lasers:** a keyboard block connected to a Particle Emitter or a Laser powers it. Each note sets the direction on a clock face: C = 12 o'clock, C♯ = 1, D = 2, and so on.
- **Global power switch** (or Space) stops and starts everything.
- **Global tempo:** the Settings panel has a tempo for the whole patch. Synced blocks like the Particle Emitter and
  Stereo Delay stay in time. (In a DAW, the DAW's tempo is used.)

## Making patches
- **Patch files:** save, open and insert `.blokdust` files. Insert adds a patch's blocks to the patch you have open.
- **Built-In Presets** to start from, to open or insert: keyboard synths, a microphone reverb recorder, a rotating laser
  sequence and a step sequencer.
- **Multi-select:** Shift-drag, Shift-click, (or press, hold, then drag on mobile) to select several blocks. Then move, duplicate (Option/Alt) or delete
  them (Backspace/Delete, or drag them to the trash) together.
- **Undo/Redo** for adding, duplicating, moving and deleting blocks (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z).
- **Filter types:** the Filter block now has Low pass, High pass, Band pass and Peak types, shaped on a graph
  like the EQ block.
- **Effect Chain Connections**: Effects are connected in the order that you add them to a Source. Patches remember that order.
- **Freesound samples:** the Sample, Granular and Convolution Reverb blocks search Creative Commons sounds on
  freesound.org (credited on the block), or use your own audio files. Your audio files never leave your computer. A shared
  link only shares the filename, so anyone opening it needs their own copy.

## Touch, trackpad and mouse
- **Zooming** with the mouse wheel, and pinch-to-zoom on touch screens and trackpads.
- **Multi-touch:** each finger can drag its own block or move its own slider.
- **Works on phones and tablets.**

## Sharing
- **Share links** with a title and a preview image for social media and chat apps.
- **Embeds:** put a playable patch on your own website.
- **Save and Save As are back**, as in v1, with no account or sign-up needed.
- **Gallery** (Patches › GALLERY): publish your patch for everyone, browse what others made (popular or new),
  search by name, block or @person, like the ones you love, open and remix them.
- **Accounts, if you want one** (Patches › ACCOUNT): sign in with a passkey (no password) or Google, and your
  patches follow you to every device. Saving and sharing still work without an account.
- **Videos for Instagram, TikTok and more** (Patches › VIDEO): turn your patch into a portrait, wide or square MP4
  of 15, 30 or 60 seconds, and share it from your device's share sheet. The video is made on your device; nothing is
  uploaded.

## Under the hood
- **New audio engine:** rebuilt in C++, compiled to WebAssembly for the browser and native in the plug-ins, so patches
  sound identical in both. It's much lighter than v1: with 100 blocks firing particles flat out, BlokDust 2 uses under
  a quarter of v1's main-thread CPU (10% of a core against 47%), and 300 sounding blocks run at a smooth 60 fps on
  under 4%.
- **Smoother reconnections:** moving blocks in and out of a chain crossfades the sound instead of clicking.
- **Deterministic:** the same patch plays the same way every time.
