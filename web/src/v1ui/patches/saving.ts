// Saving: the patch file, share links, and copying the link.
import { App } from '../shim.ts';
import { COPY } from './copy.ts';
import type { PatchItem } from './hosts.ts';
import { PatchesHitTests } from './hitTests.ts';

/** A name not among `taken` (case ignored): "Name", else "Name (2)", "Name (3)"…; a name ending
 * in " (n)" counts on from its base. */
export function uniqueTitle(title: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((title) => title.trim().toLowerCase()));
  if (!used.has(title.trim().toLowerCase())) return title;
  const base = title.replace(/\s*\(\d+\)$/, '');
  for (let number = 2; ; number++) {
    const candidate = `${base} (${number})`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

/** The clipboard, which browsers leave out of insecure (http) pages. */
const clipboardOf = (browser: Navigator): Clipboard | undefined => browser.clipboard;

export abstract class PatchesSaving extends PatchesHitTests {
  async save(): Promise<boolean> {
    this.Saving = true;
    let ok: boolean;
    try {
      ok = await this.host.savePatch(this.Title.trim() || 'Untitled');
    } finally {
      this.Saving = false;
      this.settled();
    }
    if (ok) {
      this.flash = { key: 'save', label: COPY.saved, until: performance.now() + 1500 };
      void this.refresh();
    }
    return ok;
  }
  /** SAVE (web) / CREATE SHARE LINK (plugin): see shareState. */
  protected async share(): Promise<boolean> {
    const st = this.shareState();
    if (!st.save) return false;
    if (this.host.links?.external) {
      if (await this.makeLink('saveAs')) {
        this.flash = { key: 'share', label: COPY.opened, until: performance.now() + 1500 };
        this.settled();
        return true;
      }
      return false;
    }
    // Save over this link (v1 SAVE, "overwrite"); otherwise a new link (v1 SAVE_AS).
    if (await this.makeLink(st.save === 'save' ? 'save' : 'saveAs')) {
      await this.flashSaved('share');
      return true;
    }
    return false;
  }
  /** SAVE AS: a new link; the old one keeps what it had. */
  protected async saveAsLink(): Promise<boolean> {
    if (await this.makeLink('saveAs')) {
      await this.flashSaved('saveAs');
      return true;
    }
    return false;
  }
  /** The button that saved reads LINK COPIED once the link is on the clipboard, else SAVED. */
  protected async flashSaved(key: string): Promise<void> {
    const copied = await (this.copying ?? Promise.resolve(false));
    this.copying = null;
    // The button goes once saved (owner, 2026-11-18): the message bar says so.
    this.lastSaved = { key, copied };
    this.say(copied ? COPY.savedCopied : COPY.saved);
    this.settled();
  }
  /** Saving a link copies it: browsers copy only in a press, so the press hands the clipboard a
   * promise of the link (ClipboardItem); where refused, it is copied on arrival if allowed. */
  protected copying: Promise<boolean> | null = null;
  /** Tests: the last save's button and whether its link was copied. */
  lastSaved: { key: string; copied: boolean } | null = null;
  protected copyWhenSaved(): (url: string | null) => void {
    let done: (url: string | null) => void = () => {};
    if (
      !this.web ||
      this.host.links?.external ||
      typeof navigator === 'undefined' ||
      !clipboardOf(navigator)
    ) {
      this.copying = null;
      return done;
    }
    const url = new Promise<string>((res, rej) => {
      done = (link) => {
        if (link) res(link);
        else rej(new Error('not saved'));
      };
    });
    url.catch(() => {});
    const text = () =>
      url
        .then((link) => navigator.clipboard.writeText(link))
        .then(
          () => true,
          () => false,
        );
    try {
      this.copying =
        typeof ClipboardItem === 'function' && 'write' in navigator.clipboard
          ? navigator.clipboard
              .write([
                new ClipboardItem({
                  'text/plain': url.then((link) => new Blob([link], { type: 'text/plain' })),
                }),
              ])
              .then(() => true, text)
          : text();
    } catch {
      this.copying = text();
    }
    return done;
  }
  protected async makeLink(mode: 'saveAs' | 'save'): Promise<boolean> {
    if (this.Saving || !this.host.hasBlocks() || !this.host.links) return false;
    this.Saving = true;
    this.showDom();
    const copy = this.copyWhenSaved();
    // Your own patches don't share a name: a used one gets " (2)", shown before it saves; saving
    // over this link may keep its own name.
    if (this.web) {
      const mine = await this.host.listPatches().catch(() => [] as PatchItem[]);
      const here = mode === 'save' ? App.CompositionId : null;
      const title = uniqueTitle(
        this.Title.trim() || 'Untitled',
        mine.filter((i) => !here || i.link !== here).map((i) => i.name),
      );
      if (title !== (this.Title.trim() || 'Untitled')) this.setTitle(title);
    }
    // Signed out, the gallery stays as it is (only the signed in publish: SPEC-SHARING-GALLERY R2).
    const gallery =
      this.web && this.host.gallery && this.host.signedIn() ? this.GalleryOn : undefined;
    let url: string | null = null;
    try {
      const made = await this.host.links.make(mode, this.Title.trim() || 'Untitled', gallery);
      if (made) {
        this.savedGallery = made.published;
        this.GalleryNote = made.reason ?? '';
      }
      url = this.link?.url ?? null;
      return true;
    } finally {
      copy(url);
      this.Saving = false;
      this.settled();
      this.showDom();
    }
  }
  setTitle(title: string): void {
    this.Title = title;
    if (this.domReady) this.Input.value = title;
  }

  async refresh(): Promise<void> {
    this.Loading = true;
    try {
      this.Items = await this.host.listPatches();
    } finally {
      this.Loading = false;
      this.settled();
    }
    this.OpenScroll = Math.min(this.OpenScroll, this.openMaxScroll());
  }
}
