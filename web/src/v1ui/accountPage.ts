// Settings › SIGN IN / ACCOUNT (CHG-0023, owner review 2026-11-15: in Settings beside ABOUT and DOWNLOAD, not in
// Patches; the tab reads SIGN IN until you are signed in). Drawn into v1's Settings panel like the DOWNLOAD page, with v1
// pieces only:
//   signed out: v1 About's body type for the line, then Connect's GUIDE buttons (as wide as About's text), one a way to sign in (owner
//               review 2: GOOGLE, APPLE, PASSKEY, in that order; Google and Apple only where the server offers them).
//               CONTINUE WITH PASSKEY signs in with a passkey the device has; when none is chosen it asks for a name
//               and makes the account (owner, 2026-11-17, CHG-0035: one button, as many sites do, not SIGN IN and
//               CREATE ACCOUNT);
//   naming:     a small heading in the tab type (no rule: owner review 2, it read as a text field), the Patches name
//               field (a DOM field like v1's title) over its rule, the GUIDE button, a bordered BACK;
//   signed in:  SIGNED IN AS NAME on one line in the tab type, the account's stats (R15, CHG-0027: numbers in the
//               Settings sliders' large light type over mid-type labels, the favourite blocks as v1's menu icons over
//               their names, as in the blocks menu), then half buttons (ADD PASSKEY, or ADD ANOTHER PASSKEY once there
//               is one · SIGN OUT), the ways this account signs in under them, and a bordered DELETE ACCOUNT, which
//               asks first with CANCEL · DELETE.
import { App, Dimensions, Point } from './shim.ts';
import { BLOCKS_BY_ID } from '../generated/blocks.gen.ts';
import { activity } from '../account/activity.ts';
import { Device } from './ported/Device';
import type { AccountHost, AccountInfo } from './patches.ts';

/** v1 SettingsPanel's menuWidth, About's text column: 4/7 of the panel; on a phone the width less 80 units (owner,
 * 2026-11-18). Settings › DOWNLOAD and ACCOUNT use it too (CHG-0035). */
export function pageWidth(): number { return App.SettingsMenuWidth(App.MainScene?.Width || App.Width); }

const COPY = {
  line: 'Sign in to keep your patches on every device.',
  passkey: 'Continue With Passkey', google: 'Sign In With Google', apple: 'Sign In With Apple',
  createTitle: 'New here? Choose your name', nameTitle: 'Choose your name', name: 'Name',
  noPasskey: 'No passkey was chosen. Choose a name to make a new account with a passkey on this device, or go back to try again.',
  createButton: 'Create With Passkey', saveName: 'Save Name', back: 'Back', stats: 'Stats',
  addPasskey: 'Add Passkey', addAnother: 'Add Another Passkey', signOut: 'Sign Out', deleteAccount: 'Delete Account', cancel: 'Cancel', deleteButton: 'Delete',
  deleteTitle: 'Delete your account?', deleteLine: 'This will permanently delete your account and all patches. Shared links to your patches will stop working.',
  noAccounts: 'Accounts are not available here.', working: 'one moment',
  methods: 'Sign-in methods', google1: 'Google', apple1: 'Apple', passkeyN: (n: number) => `${n} ${n === 1 ? 'passkey' : 'passkeys'}`,
  patches: 'Patches', remixes: 'Remixes', likes: 'Likes', opens: 'Plays', favourites: 'Favourite blocks',
  noFavourites: 'Save a patch to see your favourite blocks here.', mostRemixed: 'Most remixed',
  minutesPlayed: 'Minutes played', hoursPlayed: 'Hours played', blocksAdded: 'Blocks added', particles: 'Particles', laserTurns: 'Laser turns',
};
/** Where each part of the stats starts (units from the page's top). Numbers: their tops are 5 units under a row's y,
 * their labels' baselines 52; FAVOURITE BLOCKS' title tops are 2 units under its y. */
const STATS_Y = { row1: 27, row2: 96, favourites: 168, buttons: 278 } as const;
/** On a phone (owner, 2026-11-18): the numbers in two rows of four as on a desktop, with more room between the parts
 * (the screen is tall); FAVOURITE BLOCKS in two rows of three (the most remixed patch on its own line under the title),
 * then the buttons. */
const PHONE = { row1: 40, row2: 130, favourites: 232, favRow: 110, remixed: 18, buttons: 506 } as const;
/** The account page's top, in units under Settings' tabs' top (scene.ts accountTop: 35 above v1's 120). */
export const ACCOUNT_TOP = 85;
/** Favourite blocks (from FAVOURITE BLOCKS' y): the icons at half v1's menu size (owner, 2026-11-16), centred 31 units
 * down; their names' baselines 62 down (a second line 14 under). */
const FAV = { scale: 0.5, icon: 42, name: 73 } as const;
/** 1234 → 1,234; 12345 → 12.3K; 1234567 → 1.2M (the numbers are for fun: short beats exact). */
export function shortNumber(n: number): string {
  const f = (v: number, s: string) => `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10}${s}`;
  if (n >= 1e9) return f(n / 1e9, 'B');
  if (n >= 1e6) return f(n / 1e6, 'M');
  if (n >= 1e4) return f(n / 1e3, 'K');
  return Math.round(n).toLocaleString('en-GB');
}
/** A block type's menu item (its icon is drawn by name, as the blocks menu does), or null if it has none. */
function menuItem(type: string): { name: string } | null {
  const id = BLOCKS_BY_ID.get(type)?.menuId;
  for (const cat of (App.BlockCreator.MenuJson as { categories: { items: { name: string; id: string }[] }[] }).categories)
    for (const item of cat.items) if (item.id === id) return item;
  return null;
}
type Box = { x: number; y: number; w: number; h: number; cx: number };
type Bordered = { label: string; x: number; y: number; w: number; h: number; textX: number; textY: number };

export class AccountPage {
  Account: AccountInfo | null | undefined = undefined;
  View: 'main' | 'create' | 'name' | 'delete' = 'main';
  Busy = false;
  Message = '';
  private google = false;
  private apple = false;
  private noBackend = false;
  private roll: Record<string, boolean> = {};
  private readonly field = document.getElementById('accountHandle')!;
  private readonly input = document.getElementById('accountHandleInput') as HTMLInputElement;
  /** Called when who is signed in changes (the tab's name, the signed-in mark on the stage). */
  onChange: () => void = () => {};

  constructor(private readonly host: AccountHost, private readonly ctx: () => CanvasRenderingContext2D) {
    this.input.addEventListener('input', () => { this.input.value = this.input.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20); if (this.Message !== COPY.noPasskey) this.Message = ''; });
    this.input.addEventListener('keydown', e => { if (e.key === 'Enter') { this.input.blur(); void this.submit(); } });
  }

  /** Back from Google or Apple when this network has made its new accounts for the day (R1b): say so. */
  refused(message: string): void { this.View = 'main'; this.Message = message; this.mark(); }
  /** The Settings tab's name: SIGN IN until signed in. */
  get tabName(): string { return this.Account ? 'account' : 'sign in'; }
  get animating(): boolean { return this.Busy || this.Account === undefined || performance.now() < this.settle; }
  /** Keep drawing a moment after something async lands, so its last state is drawn. */
  private settle = 0;
  private mark(): void { this.settle = performance.now() + 300; }

  /** Ask who is signed in (opening the tab, and after any change); `stats` with the account's stats (R15: only for the
   * tab, so loading the page asks for less). */
  async refresh(stats = true): Promise<void> {
    const m = await this.host.me(stats);
    const before = this.Account?.handle ?? null, was = this.Account;
    this.noBackend = !m; this.google = !!m?.google; this.apple = !!m?.apple; this.Account = m?.user ?? null;
    // Without stats asked for, keep the ones already shown for the same account.
    if (this.Account && !this.Account.stats && was?.stats && was.handle === this.Account.handle) this.Account.stats = was.stats;
    // A new Google account has no name yet: ask for one (SPEC-SHARING-ACCOUNTS R6).
    if (this.Account && !this.Account.handle && this.View === 'main') { this.View = 'name'; this.input.value = ''; }
    if (!this.Account && this.View !== 'create') this.View = 'main';
    if (was === undefined || (this.Account?.handle ?? null) !== before || !!was !== !!this.Account) this.onChange();
    this.mark();
  }

  // ---- layout, from the page's top (Settings: OffsetY + 120 units + the tab's YOffset) ----
  private textW(t: string, font = App.Metrics.TxtMid) { const c = this.ctx(); c.font = font; return c.measureText(t.toUpperCase()).width; }
  private bordered(label: string, right: number, top: number): Bordered {
    const u = App.Unit, w = this.textW(label);
    return { label, x: right - 10 * u - w, y: top, w: w + 10 * u, h: 20 * u, textX: right - 5 * u - w, textY: top + 14 * u };
  }
  /** The page's width: About's text column (v1 SettingsPanel menuWidth: 4/7 of the panel, 5/7 on a phone; owner,
   * 2026-11-17, CHG-0035: it was 420 units, narrower than About's). */
  private pageW(): number { return pageWidth(); }
  private layout(top: number) {
    const u = App.Unit, W = App.Width, pw = this.pageW(), L = W * 0.5 - pw * 0.5, R = W * 0.5 + pw * 0.5, hw = (pw - 15 * u) * 0.5;
    const half = (right: boolean, y: number): Box => { const x = right ? W * 0.5 + 7.5 * u : L; return { x, y, w: hw, h: 40 * u, cx: x + hw * 0.5 }; };
    const full = (y: number): Box => ({ x: L, y, w: pw, h: 40 * u, cx: W * 0.5 });
    // Signed out: one row per way to sign in, 15 units apart.
    const ways = this.ways(), out: Record<string, Box> = {};
    ways.forEach((k, i) => { out[k] = full(top + (35 + i * 55) * u); });
    const below = top + (35 + ways.length * 55) * u;
    const naming = { field: top + 24 * u, rule: top + 66 * u, submit: full(top + 85 * u), back: this.bordered(COPY.back, L + this.textW(COPY.back) + 10 * u, top + 145 * u) };
    // The account's buttons under its stats (R15); 35 units under the SIGNED IN line until they arrive. DELETE ACCOUNT
    // sits top right, on the SIGNED IN line (CHG-0027: the stats need its row).
    const below2 = top + this.statsHeight() * u;
    // DELETE ACCOUNT at the bottom right of the screen, out of the way (owner, 2026-11-18); it slides with the page.
    const screenBottom = top - ACCOUNT_TOP * u + App.Height;
    const signedIn = { add: half(false, below2), out: half(true, below2), del: this.bordered(COPY.deleteAccount, W - 20 * u, screenBottom - 40 * u) };
    const del = { cancel: half(false, top + 75 * u), ok: half(true, top + 75 * u) };
    // Signed in: the ways in on the line under the buttons, then any message.
    const methods = below2 + 62 * u;
    const message = this.View === 'main' && !this.Account ? below + 10 * u : this.View === 'main' ? methods + 24 * u : top + 190 * u;
    return { L, R, out, naming, signedIn, del, methods, message };
  }
  /** The ways to sign in, in the owner's order: Google, Apple, then a passkey (always offered). */
  private ways(): ('google' | 'apple' | 'passkey')[] {
    return [...(this.google ? ['google' as const] : []), ...(this.apple ? ['apple' as const] : []), 'passkey'];
  }

  // ---- drawing (v1's own pieces) ----
  private filled(b: Box, colour: string, label: string, hover: boolean, small = false): void {
    const c = this.ctx(), u = App.Unit;
    App.FillColor(c, colour); c.fillRect(b.x, b.y, b.w, b.h);
    if (hover) { c.beginPath(); c.moveTo(b.cx, b.y + b.h + 9 * u); c.lineTo(b.cx - 10 * u, b.y + b.h - u); c.lineTo(b.cx + 10 * u, b.y + b.h - u); c.closePath(); c.fill(); }
    App.FillColor(c, App.Palette[App.ThemeManager.Txt]); c.textAlign = 'center'; c.font = small ? App.Metrics.TxtMid : App.Metrics.TxtUrl2;
    const t = label.toUpperCase(), w = c.measureText(t).width, max = b.w - 12 * u, y = b.y + (small ? 25 : 29) * u;
    if (w > max) { c.save(); c.translate(b.cx, 0); c.scale(max / w, 1); c.fillText(t, 0, y); c.restore(); } else c.fillText(t, b.cx, y);
  }
  private drawBordered(b: Bordered, stroke: string): void {
    const c = this.ctx();
    c.font = App.Metrics.TxtMid; c.textAlign = 'left'; App.FillColor(c, App.Palette[App.ThemeManager.Txt]);
    c.fillText(b.label.toUpperCase(), b.textX, b.textY);
    App.StrokeColor(c, stroke); c.lineWidth = 2; c.beginPath(); c.rect(b.x, b.y, b.w, b.h); c.stroke();
  }
  private wrap(text: string, x: number, y: number, lh: number, width: number): number {
    const c = this.ctx();
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (c.measureText(t).width > width && line) { c.fillText(line, x, y); y += lh; line = word; } else line = t;
    }
    if (line) { c.fillText(line, x, y); y += lh; }
    return y;
  }
  /** A sub-heading: the tab type (v1's mid type), no rule under it (owner review 2), and its italic line if any. */
  private heading(title: string, line: string, top: number, L: number): void {
    const c = this.ctx(), u = App.Unit, txt = App.Palette[App.ThemeManager.Txt];
    App.FillColor(c, txt); c.textAlign = 'left'; c.font = App.Metrics.TxtMid;
    c.fillText(title.toUpperCase(), L, top + 10 * u);
    if (line) { c.font = App.Metrics.TxtItalic2; this.wrap(line, L, top + 32 * u, 14 * u, this.pageW()); }
  }

  // ---- stats (R15) ----
  // Rows in units from the page's top, one even gap (22 units) between SIGNED IN, the two rows of numbers, FAVOURITE
  // BLOCKS and the buttons (owner, 2026-11-16: it was roomy at the top and bunched from FAVOURITE BLOCKS down).
  /** The stats' rows, in units from the page's top (the account buttons go below them). */
  private statsHeight(): number {
    const st = this.Account?.stats;
    if (!st) return 35;
    return App.SettingsPhone ? PHONE.buttons : STATS_Y.buttons;
  }
  /** One row of numbers, four columns across the page: the number large and light, its label under it. */
  private numberRow(cells: [string, string][], y: number, L: number): void {
    const c = this.ctx(), u = App.Unit, w = this.pageW() / cells.length;
    App.FillColor(c, App.Palette[App.ThemeManager.Txt]); c.textAlign = 'center';
    cells.forEach(([n, label], i) => {
      const x = L + w * (i + 0.5);
      c.font = App.Metrics.TxtSlider; c.fillText(n, x, y + 32 * u);
      c.font = App.Metrics.TxtMid; c.fillText(label.toUpperCase(), x, y + 52 * u);
    });
  }
  private drawStats(top: number, L: number, R: number): void {
    const st = this.Account?.stats, c = this.ctx(), u = App.Unit, txt = App.Palette[App.ThemeManager.Txt];
    if (!st) { App.AnimationsLayer.DrawSprite(c, 'loading', App.Width * 0.5, top + 25 * u, 16, true); return; }
    // R16: the running totals, with what this browser counted and hasn't sent yet (so they move without a request).
    const p = activity.pending(), ms = st.playMs + p.playMs, hours = ms >= 3_600_000;
    const played = hours ? (ms < 36_000_000 ? (Math.floor(ms / 360_000) / 10).toString() : shortNumber(Math.floor(ms / 3_600_000))) : shortNumber(Math.floor(ms / 60_000));
    const cells: [string, string][] = [[shortNumber(st.patches), COPY.patches], [shortNumber(st.remixes), COPY.remixes], [shortNumber(st.likes), COPY.likes], [shortNumber(st.opens), COPY.opens],
      [played, hours ? COPY.hoursPlayed : COPY.minutesPlayed], [shortNumber(st.blocksAdded + p.blocks), COPY.blocksAdded],
      [shortNumber(Math.floor(st.particles + p.particles)), COPY.particles], [shortNumber(Math.floor(st.laserTurns + p.laserTurns)), COPY.laserTurns]];
    const phone = App.SettingsPhone;
    this.numberRow(cells.slice(0, 4), top + (phone ? PHONE.row1 : STATS_Y.row1) * u, L);
    this.numberRow(cells.slice(4), top + (phone ? PHONE.row2 : STATS_Y.row2) * u, L);
    let y = top + (phone ? PHONE.favourites : STATS_Y.favourites) * u;
    // Favourite blocks: v1's menu icons (BlockSprites, as the blocks menu draws them) at half size over their names.
    App.FillColor(c, txt); c.font = App.Metrics.TxtMid; c.textAlign = 'left';
    c.fillText(COPY.favourites.toUpperCase(), L, y + 10 * u);
    // The most remixed patch on the same line, at the right (a phone: on its own line under it).
    if (st.mostRemixed) {
      const n = st.mostRemixed.n, t = st.mostRemixed.title || 'Untitled';
      c.font = App.Metrics.TxtItalic2; c.textAlign = phone ? 'left' : 'right';
      c.fillText(`${COPY.mostRemixed}: ${t.length > 24 ? `${t.slice(0, 23)}…` : t}, ${n} ${n === 1 ? 'time' : 'times'}`, phone ? L : R, y + (phone ? 10 + PHONE.remixed : 10) * u);
      c.textAlign = 'left';
    }
    if (phone) y += PHONE.remixed * u;
    // Five in a row; a phone: two rows of three.
    const favs = st.favourites.map(f => ({ ...f, item: menuItem(f.type) })).filter(f => f.item).slice(0, phone ? 6 : 5);
    if (!favs.length) { c.font = App.Metrics.TxtItalic2; c.fillText(COPY.noFavourites, L, y + FAV.icon * u); }
    const w = phone ? this.pageW() / 3 : 84 * u;
    favs.forEach((f, k) => {
      const i = phone ? k % 3 : k, rowY = y + (phone ? Math.floor(k / 3) * PHONE.favRow * u : 0);
      const x = L + w * (i + 0.5);
      const iy = rowY + FAV.icon * u;
      c.save(); c.translate(x, iy); c.scale(FAV.scale, FAV.scale); c.translate(-x, -iy);
      App.BlockSprites.DrawSprite({ Ctx: c }, new Point(x, iy), false, f.item!.name.toLowerCase());
      c.restore();
      // Its name, on two lines when it is wider than its column (PARTICLE EMITTER beside COMPUTER KEYBOARD).
      App.FillColor(c, txt); c.font = App.Metrics.TxtMid; c.textAlign = 'center';
      const name = f.item!.name.toUpperCase(), words = name.split(' ');
      if (words.length > 1 && c.measureText(name).width > w - 6 * u) {
        const cut = Math.ceil(words.length / 2);
        c.fillText(words.slice(0, cut).join(' '), x, rowY + FAV.name * u); c.fillText(words.slice(cut).join(' '), x, rowY + (FAV.name + 14) * u);
      } else c.fillText(name, x, rowY + FAV.name * u);
    });
  }

  draw(top: number): void {
    const c = this.ctx(), u = App.Unit, W = App.Width, txt = App.Palette[App.ThemeManager.Txt], menu = App.ThemeManager.MenuOrder;
    const Lo = this.layout(top), busy = this.Busy, r = this.roll;
    if (this.View === 'create' || this.View === 'name') {
      const create = this.View === 'create';
      this.heading(create ? COPY.createTitle : COPY.nameTitle, '', top, Lo.L);
      App.FillColor(c, txt); c.font = App.Metrics.TxtMid; c.textAlign = 'right';
      if (App.Metrics.Device !== Device.mobile) c.fillText(COPY.name.toUpperCase(), Lo.L - 15 * u, Lo.naming.field + 28 * u);
      App.StrokeColor(c, txt); c.lineWidth = 2; c.beginPath(); c.moveTo(Lo.L, Lo.naming.rule); c.lineTo(Lo.R, Lo.naming.rule); c.stroke();
      this.filled(Lo.naming.submit, App.Palette[busy ? 1 : menu[3]], busy ? COPY.working : create ? COPY.createButton : COPY.saveName, !busy && !!r.submit);
      if (create) this.drawBordered(Lo.naming.back, App.Palette[1]);
    } else if (this.View === 'delete') {
      this.heading(COPY.deleteTitle, COPY.deleteLine, top, Lo.L);
      this.filled(Lo.del.cancel, App.Palette[1], COPY.cancel, !!r.deleteCancel);
      this.filled(Lo.del.ok, App.Palette[menu[3]], busy ? COPY.working : COPY.deleteButton, !busy && !!r.deleteOk);
    } else if (this.Account) {
      App.FillColor(c, txt); c.textAlign = 'left'; c.font = App.Metrics.TxtMid;
      c.fillText(COPY.stats.toUpperCase(), Lo.L, top + 10 * u);  // the corner already says who (owner, 2026-11-18)
      this.drawStats(top, Lo.L, Lo.R);
      this.filled(Lo.signedIn.add, App.Palette[busy ? 1 : menu[1]], this.addLabel, !busy && !!r.addPasskey, true);
      this.filled(Lo.signedIn.out, App.Palette[busy ? 1 : menu[3]], COPY.signOut, !busy && !!r.signOut, true);
      this.drawBordered(Lo.signedIn.del, App.Palette[1]);
      App.FillColor(c, txt); c.font = App.Metrics.TxtItalic2; c.textAlign = 'left';
      c.fillText(`${COPY.methods}: ${this.methods().join(' · ')}`, Lo.L, Lo.methods);
    } else {
      App.FillColor(c, txt); c.font = App.Metrics.TxtMid; c.textAlign = 'left';
      c.fillText(this.noBackend ? COPY.noAccounts : COPY.line, Lo.L, top + 10 * u);
      if (this.Account === undefined && !this.noBackend) App.AnimationsLayer.DrawSprite(c, 'loading', W * 0.5, top + 55 * u, 16, true);
      else if (!this.noBackend) {
        // Each its own menu colour, as Connect's GUIDE buttons and the Patches panel's.
        const colours = { google: menu[3], apple: menu[1], passkey: menu[2 % menu.length] } as const;
        for (const k of this.ways()) this.filled(Lo.out[k], App.Palette[busy ? 1 : colours[k]], COPY[k], !busy && !!r[k]);
      }
    }
    if (this.Message) { App.FillColor(c, txt); c.font = App.Metrics.TxtItalic2; c.textAlign = 'left'; this.wrap(this.Message, Lo.L, Lo.message, 14 * u, this.pageW()); }
  }

  /** The name field follows the page (it slides with the tab); shown only while naming. */
  placeField(top: number, shown: boolean): void {
    const on = shown && (this.View === 'create' || this.View === 'name');
    this.field.style.display = on ? 'block' : 'none';
    if (!on) return;
    const u = App.Unit, pr = App.Metrics.PixelRatio;
    this.field.style.font = App.Metrics.TxtHeaderPR;
    this.field.style.width = `${this.pageW() / pr}px`; this.field.style.height = `${(u * 42) / pr}px`; this.field.style.lineHeight = `${(u * 42) / pr}px`;
    this.field.style.left = `${(App.Width - this.pageW()) * 0.5 / pr}px`;
    this.field.style.top = `${this.layout(top).naming.field / pr}px`;
  }

  // ---- input ----
  private boxes(top: number): Record<string, { x: number; y: number; w: number; h: number }> {
    const Lo = this.layout(top), pad = (b: Bordered) => ({ x: b.x - 5 * App.Unit, y: b.y - 10 * App.Unit, w: b.w + 10 * App.Unit, h: 40 * App.Unit });
    if (this.View === 'create' || this.View === 'name') return { submit: Lo.naming.submit, ...(this.View === 'create' ? { back: pad(Lo.naming.back) } : {}) };
    if (this.View === 'delete') return { deleteCancel: Lo.del.cancel, deleteOk: Lo.del.ok };
    if (this.Account) return { addPasskey: Lo.signedIn.add, signOut: Lo.signedIn.out, deleteAccount: pad(Lo.signedIn.del) };
    if (this.Account === null && !this.noBackend) return { ...Lo.out };
    return {};
  }
  hit(pt: { x: number; y: number }, top: number): boolean {
    const r: Record<string, boolean> = {};
    for (const [k, b] of Object.entries(this.boxes(top))) r[k] = Dimensions.hitRect(b.x, b.y, b.w, b.h, pt.x, pt.y);
    this.roll = r;
    return Object.values(r).some(Boolean);
  }
  /** Tests: a control's centre in CSS px. */
  centreOf(name: string, top: number): [number, number] | null {
    const b = this.boxes(top)[name], pr = App.Metrics.PixelRatio;
    return b ? [(b.x + b.w / 2) / pr, (b.y + b.h / 2) / pr] : null;
  }
  press(): void {
    const r = this.roll, a = this.host;
    if (this.Busy) return;
    this.mark();
    if (r.passkey) { void this.continueWithPasskey(); return; }
    if (r.google) { a.google(); return; }
    if (r.apple) { a.apple(); return; }
    if (r.back) { this.View = 'main'; this.Message = ''; return; }
    if (r.submit) { void this.submit(); return; }
    if (r.addPasskey) { void this.action(() => a.addPasskey()); return; }  // the methods line shows it (no message: owner, 2026-11-18)
    if (r.signOut) { void this.action(() => a.signOut(false)); return; }
    if (r.deleteAccount) { this.View = 'delete'; this.Message = ''; return; }
    if (r.deleteCancel) { this.View = 'main'; return; }
    if (r.deleteOk) { void this.action(() => a.deleteAccount()); }
  }
  /** ADD PASSKEY, or ADD ANOTHER PASSKEY once the account has one. */
  get addLabel(): string { return (this.Account?.passkeys ?? 0) > 0 ? COPY.addAnother : COPY.addPasskey; }
  /** The ways this account signs in (Settings › ACCOUNT, under its buttons): Google, Apple, its passkeys. */
  methods(): string[] {
    const a = this.Account!, out: string[] = [];
    if (a.providers.includes('google')) out.push(COPY.google1);
    if (a.providers.includes('apple')) out.push(COPY.apple1);
    if (a.passkeys > 0 || !out.length) out.push(COPY.passkeyN(a.passkeys));
    return out;
  }
  /** CONTINUE WITH PASSKEY: sign in with one the device has; none chosen (or one this site no longer knows), make a
   * new account with one instead (SPEC-SHARING-ACCOUNTS R1, R2). Browsers don't say whether the user closed the
   * dialog or had no passkey, so both lead to the name step, which has BACK. */
  private async continueWithPasskey(): Promise<void> {
    this.Busy = true; this.Message = '';
    try { await this.host.signIn(); this.View = 'main'; await this.refresh(); }
    catch (e) {
      if (this.host.cancelled(e) || (e as { status?: number }).status === 401) {
        this.View = 'create'; this.Message = COPY.noPasskey; this.input.value = ''; setTimeout(() => this.input.focus(), 0);
      } else this.Message = (e as Error).message || 'That did not work. Try again.';
    } finally { this.Busy = false; this.mark(); }
  }
  private async action(run: () => Promise<void>): Promise<boolean> {
    this.Busy = true; this.Message = '';
    try { await run(); this.View = 'main'; await this.refresh(); return true; }
    catch (e) { if (!this.host.cancelled(e)) this.Message = (e as Error).message || 'That did not work. Try again.'; return false; }
    finally { this.Busy = false; this.mark(); }
  }
  private async submit(): Promise<void> {
    const h = this.input.value.trim().toLowerCase();
    if (!h) { this.Message = 'Choose a name first.'; return; }
    if (this.View === 'create') await this.action(() => this.host.signUp(h));
    else if (this.View === 'name') await this.action(() => this.host.setHandle(h));
  }
}
