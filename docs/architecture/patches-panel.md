# The Patches panel

How the Patches panel (`web/src/v1ui/patches/`, CHG-0005) is laid out, and which v1 pieces each part is drawn
with. Moved here from the head of `panel.ts` (CHG-0045); the code's comments point here.

The Patches panel (CHG-0005; layout by the owner, 2026-11-10): two tabs, SAVE and OPEN.

SAVE holds nothing that can replace the current patch: the patch name, then (web) CREATE SHARE LINK, which becomes
COPY LINK once made and SAVE (to the same link) once the patch has changed, with SAVE AS (a new link) under the link;
and SAVE TO COMPUTER (a `.blokdust` file). The plugin has SAVE TO COMPUTER first, then CREATE SHARE LINK, which makes
the link in the web browser (owner, 2026-11-10). OPEN lists the patches saved here (web: this browser's; plugin: the
patches folder) and the built-in presets, with an OPEN and an INSERT button on every row, and OPEN FROM YOUR DEVICE,
which asks Open or Insert once a file is picked. Opening over unsaved changes asks first (CANCEL · SAVE FIRST · OPEN
ANYWAY). The last tab chosen is remembered.

Nothing here is a new style: every piece is drawn with v1's own code and metrics, copied from
  - SettingsPanel: the panel title, the tab bar (MenuCategory fills with their notch, dividers) and its close cross;
  - SharePanel: TITLE field + rule + RANDOMISE TITLE, the filled SAVE/SAVE AS half buttons with their hover notch,
    the italic copy, the URL box, the "saving…" spinner, the warnings, and its back chevron with a label (SKIP);
  - SettingsPanel › Connect: the three 130×30 filled buttons (for the confirm step), and its 420×40 GUIDE button
    (OPEN FROM YOUR DEVICE, the OPEN tab's main button);
  - SoundcloudPanel: the paged rows, count, page number, arrows, and its bordered button (OPEN / INSERT);

Owner review 1 (2026-11-15): three tabs, SAVE / SHARE · OPEN · GALLERY (web; the plugin keeps SAVE and OPEN).
SAVE / SHARE (web) adds, from v1 pieces:
  - ADD TO GALLERY: v1's OptionSwitch ("offOn": a dash, a divider, a diamond, the chosen side underlined), with the
    options type for its name; signed out, an italic line says only signed-in users can publish;
Owner review 2 (option A): one main button. Under the name, two switches, ADD TO GALLERY and MAKE VIDEO (on by
default where the browser can share a video file, i.e. phones and tablets), then SAVE: Connect's 420×40 GUIDE button
in SharePanel's SAVE colour. The link sits under it. SAVE AS and DOWNLOAD PATCH (not on phones) are v1's bordered
buttons at the bottom. Saving with MAKE VIDEO on goes on to the video: portrait, as long as the patch's timers need
(videoSeconds), shown as it renders with SharePanel's spinner, then played in a small portrait player (a DOM video
over the panel, like v1's text fields) with SHARE VIDEO under it (DOWNLOAD VIDEO on desktop, where it also downloads
once made). Nothing to save, the main button reads MAKE VIDEO. The plugin keeps SAVE TO COMPUTER · CREATE SHARE
LINK and has no video.
GALLERY (CHG-0024) is v1 SoundcloudPanel's layout: the search field over its rule with the bordered SEARCH above it,
and POPULAR / NEW bottom right where v1 had RANDOMISE. Owner review 2: the rows are one list that scrolls (wheel or
drag) and loads the next page as it nears its end, and each row has OPEN only (liking is on the stage, with the patch
open: web/src/app; reporting is Settings › FEEDBACK, CHG-0041).
