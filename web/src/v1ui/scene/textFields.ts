// The DOM text fields the panels place over the canvas.

/** v1 index.html's share inputs (the Share panel positions real DOM text fields over the canvas)
 * and their v1 CSS (styles.css), with the link field changed as noted below. */
export function ensureTextFields(): void {
  if (document.getElementById('shareUrl')) return;
  const style = document.createElement('style');
  style.textContent = `#shareUrl, #shareTitle, #soundCloudSearch, #patchTitle, #patchUrl, #accountHandle, #gallerySearch { font-family: "Dosis", Arial, Helvetica, sans-serif; font-weight: 200; font-size: 56px;
    mix-blend-mode: normal; background-blend-mode: normal; width: 200px; height: 100px; position: absolute; left: 1000%; top: -100%; }
  #shareUrl form, #shareTitle form, #soundCloudSearch form, #patchTitle form, #patchUrl form, #accountHandle form, #gallerySearch form { width: inherit; height: inherit; }
  #patchUrl input { text-overflow: ellipsis; }
  #shareUrl input, #shareTitle input, #soundCloudSearch input, #patchTitle input, #patchUrl input, #accountHandle input, #gallerySearch input { overflow: scroll; scrollbar-width: none; white-space: nowrap; width: inherit; height: inherit; font: inherit;
    line-height: inherit; color: inherit; outline: none; border: none; padding: 0; margin: 0; background-color: transparent; resize: none; }
  #shareUrl input::-webkit-scrollbar, #shareTitle input::-webkit-scrollbar, #soundCloudSearch input::-webkit-scrollbar, #patchTitle input::-webkit-scrollbar, #patchUrl input::-webkit-scrollbar, #accountHandle input::-webkit-scrollbar, #gallerySearch input::-webkit-scrollbar { display: none; }
  #shareTitle input, #soundCloudSearch input, #patchTitle input, #accountHandle input, #gallerySearch input { text-transform: uppercase; }`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div id="shareUrl"><form action=""><input type="text" id="shareUrlText" name="url" readonly autocomplete="off" spellcheck="false"></form></div>
    <div id="shareTitle"><form action=""><input type="text" id="shareTitleInput" name="title" autocomplete="off" spellcheck="false" maxlength="24" value=""></form></div>
    <div id="soundCloudSearch"><form action=""><input type="text" id="soundCloudSearchInput" name="title" autocomplete="off" spellcheck="false" maxlength="24" value=""></form></div>
    <div id="patchTitle"><form action=""><input type="text" id="patchTitleInput" name="title" autocomplete="off" spellcheck="false" maxlength="48" value=""></form></div>
    <div id="patchUrl"><form action=""><input type="text" id="patchUrlText" name="url" readonly autocomplete="off" spellcheck="false"></form></div>
    <div id="accountHandle"><form action=""><input type="text" id="accountHandleInput" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" value=""></form></div>
    <div id="gallerySearch"><form action=""><input type="text" id="gallerySearchInput" name="q" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" value=""></form></div>`;
  // The video player on SAVE / SHARE: portrait, over the panel like the text fields.
  const video = document.createElement('video');
  video.id = 'patchVideo';
  video.playsInline = true;
  video.loop = true;
  video.controls = true;
  video.preload = 'auto';
  Object.assign(video.style, {
    position: 'absolute',
    display: 'none',
    background: '#000',
    objectFit: 'contain',
  });
  wrap.appendChild(video);
  for (const el of [...wrap.children]) document.body.appendChild(el);
  // Enter in these fields is handled by the panels (v1 EnterCheck); never submit (reload) the page.
  for (const element of document.querySelectorAll(
    '#shareUrl form, #shareTitle form, #soundCloudSearch form, #patchTitle form, #patchUrl form, #accountHandle form, #gallerySearch form',
  ))
    element.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  // v1 used a scrolling <textarea>; v2 shows the link on one line like the title field, with no
  // scrollbars, and a click selects the whole link (owner review 2026-11-06).
  for (const id of ['shareUrlText', 'patchUrlText']) {
    const ta = document.getElementById(id) as HTMLInputElement;
    ta.addEventListener('click', () => {
      ta.focus();
      ta.selectionStart = 0;
      ta.selectionEnd = ta.value.length;
    });
  }
}
