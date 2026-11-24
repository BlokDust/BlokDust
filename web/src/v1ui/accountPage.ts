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
//               their names, as in the blocks menu), then half buttons (SIGN-IN METHODS · SIGN OUT), the ways this
//               account signs in under them, and a bordered DELETE ACCOUNT, which asks first with CANCEL · DELETE;
//   methods:    SIGN-IN METHODS (CHG-0039, owner 2026-11-19): the heading, a row per way in (its name, when it was
//               added, a bordered REMOVE at the right while there is more than one; v1 Open's rows and rules), then
//               the GUIDE buttons for ADD GOOGLE / ADD APPLE (those not linked yet) and ADD PASSKEY, and BACK. Under
//               the ways in, APPS SIGNED IN: each plugin signed in to the account, with REMOVE (SHARING-0011);
//   approve:    (website, `?link=CODE` from a plugin) "Sign in BlokDust on another device?", what asks and the code,
//               CANCEL · APPROVE; with no code, the name field takes it;
//   plugins:    (SHARING-0011) signed out, SIGN IN WITH YOUR BROWSER: the code large, the browser opened (the AUv3,
//               which can't open one: a QR code of the address), waiting with v1's spinner, BACK. Signed in: the
//               stats, then SIGN OUT (methods and deleting are the website's); signing in goes back to the stage.
import { App, Dimensions, Point } from './shim.ts';
import { BLOCKS_BY_ID } from '../generated/blocks.gen.ts';
import { activity } from '../account/activity.ts';
import { Device } from './ported/Device';
import type { AccountHost, AccountInfo } from './patches.ts';
import type { SignInMethod, SignedInApp } from '../account/client.ts';
import type { DeviceCode } from '../account/device.ts';
import qrcode from 'qrcode-generator';

/** v1 SettingsPanel's menuWidth, About's text column: 4/7 of the panel; on a phone the width less 80 units (owner,
 * 2026-11-18). Settings › DOWNLOAD and ACCOUNT use it too (CHG-0035). */
export function pageWidth(): number {
  return App.SettingsMenuWidth(App.MainScene?.Width || App.Width);
}

const COPY = {
  line: 'Sign in to keep your patches on every device.',
  passkey: 'Continue With Passkey',
  google: 'Sign In With Google',
  apple: 'Sign In With Apple',
  passkeyApp: 'Sign In With Passkey',
  createTitle: 'New here? Choose your name',
  nameTitle: 'Choose your name',
  name: 'Name',
  noPasskey:
    'No passkey was chosen. Choose a name to make a new account with a passkey on this device, or go back to try again.',
  createButton: 'Create With Passkey',
  saveName: 'Save Name',
  back: 'Back',
  stats: 'Stats',
  addPasskey: 'Add Passkey',
  addAnother: 'Add Another Passkey',
  signOut: 'Sign Out',
  methodsButton: 'Sign-in Methods',
  methodsTitle: 'Sign-in methods',
  methodsLine: 'Any of these signs in to this account. Keep at least one.',
  addGoogle: 'Add Google',
  addApple: 'Add Apple',
  remove: 'Remove',
  passkey1: 'Passkey',
  added: (d: string) => `Added ${d}`,
  removed: (n: string) => `${n} removed.`,
  apps: 'Apps signed in',
  lastUsed: (d: string) => `Last used ${d}`,
  pluginLine:
    'Sign in to open the patches you saved on the website, and to save to them from here.',
  browser: 'Sign In With Your Browser',
  codeTitle: 'Sign in with your browser',
  codeOpened:
    'Your browser has opened. Sign in there, check it shows this code, and press APPROVE.',
  codeGo: (at: string) =>
    `On your phone or computer, go to ${at} and enter this code, or scan the QR code with your phone's camera.`,
  waiting: 'Waiting for you to approve it…',
  openAgain: 'Open Browser Again',
  denied: 'Sign-in was turned down on the website.',
  expired: 'The code expired. Try again.',
  approveTitle: 'Sign in BlokDust on another device?',
  approveLine: (name: string, handle: string) =>
    `${name} asks to sign in as @${handle}. Check it shows this code, then press APPROVE.`,
  enterTitle: 'Enter the code BlokDust shows',
  continue: 'Continue',
  approve: 'Approve',
  approved: (name: string) => `${name} is signed in. You can go back to it now.`,
  turnedDown: (name: string) => `${name} was not signed in.`,
  signInToApprove: 'Sign in to approve BlokDust on your other device.',
  deleteAccount: 'Delete Account',
  cancel: 'Cancel',
  deleteButton: 'Delete',
  deleteTitle: 'Delete your account?',
  deleteLine:
    'This will permanently delete your account and all patches. Shared links to your patches will stop working.',
  noAccounts: 'Accounts are not available here.',
  working: 'one moment',
  methods: 'Sign-in methods',
  google1: 'Google',
  apple1: 'Apple',
  passkeyN: (n: number) => `${n} ${n === 1 ? 'passkey' : 'passkeys'}`,
  patches: 'Patches',
  remixes: 'Remixes',
  likes: 'Likes',
  opens: 'Plays',
  favourites: 'Favourite blocks',
  noFavourites: 'Save a patch to see your favourite blocks here.',
  mostRemixed: 'Most remixed',
  minutesPlayed: 'Minutes played',
  hoursPlayed: 'Hours played',
  blocksAdded: 'Blocks added',
  particles: 'Particles',
  laserTurns: 'Laser turns',
};
/** Where each part of the stats starts (units from the page's top). Numbers: their tops are 5 units under a row's y,
 * their labels' baselines 52; FAVOURITE BLOCKS' title tops are 2 units under its y. */
const STATS_Y = { row1: 27, row2: 96, favourites: 168, buttons: 278 } as const;
/** On a phone (owner, 2026-11-18): the numbers in two rows of four as on a desktop, with more room between the parts
 * (the screen is tall); FAVOURITE BLOCKS in two rows of three (the most remixed patch on its own line under the title),
 * then the buttons. */
const PHONE = {
  row1: 40,
  row2: 130,
  favourites: 232,
  favRow: 110,
  remixed: 18,
  buttons: 506,
} as const;
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
  for (const cat of (
    App.BlockCreator.MenuJson as { categories: { items: { name: string; id: string }[] }[] }
  ).categories)
    for (const item of cat.items) if (item.id === id) return item;
  return null;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
}
interface Bordered {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  textX: number;
  textY: number;
}

export class AccountPage {
  Account: AccountInfo | null | undefined = undefined;
  View: 'main' | 'create' | 'name' | 'delete' | 'methods' | 'code' | 'approve' = 'main';
  /** The plugin's code waiting for approval (SHARING-0011). */
  Device: DeviceCode | null = null;
  /** The website: plugins signed in to this account (SIGN-IN METHODS). */
  Apps: SignedInApp[] = [];
  /** The website: a plugin's code to approve, and what it calls itself once known. */
  ApproveCode: string | null = null;
  ApproveName: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | undefined;
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

  constructor(
    private readonly host: AccountHost,
    private readonly ctx: () => CanvasRenderingContext2D,
  ) {
    this.input.addEventListener('input', () => {
      this.input.value = this.input.value
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20);
      if (this.Message !== COPY.noPasskey) this.Message = '';
    });
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.input.blur();
        void this.submit();
      }
    });
  }

  /** Back from Google or Apple having added it, or refused because it belongs to another account (R7a, R7b). */
  showMethods(message: string): void {
    this.View = 'methods';
    this.Message = message;
    void this.loadApps();
    this.mark();
  }
  /** The website, opened at a plugin's code (`?link=CODE`, SHARING-0011): ask to approve it (signed out: sign in first;
   * the code waits). */
  showApprove(code: string): void {
    this.ApproveCode = code || null;
    this.ApproveName = null;
    this.Message = '';
    this.View = 'approve';
    if (!code) {
      this.input.value = '';
      setTimeout(() => {
        this.input.focus();
      }, 0);
    }
    void this.lookUpCode();
    this.mark();
  }
  private async lookUpCode(): Promise<void> {
    const approveCode = this.ApproveCode,
      apps = this.host.apps;
    if (!approveCode || !apps || !this.Account) return;
    try {
      this.ApproveName = (await apps.info(approveCode)).name;
    } catch (error) {
      this.Message = (error as Error).message;
      this.ApproveCode = null;
    }
    this.mark();
  }
  private async loadApps(): Promise<void> {
    if (!this.host.apps || !this.Account) {
      this.Apps = [];
      return;
    }
    try {
      this.Apps = await this.host.apps.list();
    } catch {
      this.Apps = [];
    }
    this.mark();
  }
  /** Back from Google or Apple when this network has made its new accounts for the day (R1b): say so. */
  refused(message: string): void {
    this.View = 'main';
    this.Message = message;
    this.mark();
  }
  /** The Settings tab's name: SIGN IN until signed in. */
  get tabName(): string {
    return this.Account ? 'account' : 'sign in';
  }
  get animating(): boolean {
    return (
      this.Busy ||
      this.Account === undefined ||
      this.View === 'code' ||
      (this.View === 'approve' && !!this.ApproveCode && !this.ApproveName) ||
      performance.now() < this.settle
    );
  }
  /** Keep drawing a moment after something async lands, so its last state is drawn. */
  private settle = 0;
  private mark(): void {
    this.settle = performance.now() + 300;
  }

  /** Ask who is signed in (opening the tab, and after any change); `stats` with the account's stats (R15: only for the
   * tab, so loading the page asks for less). */
  async refresh(stats = true): Promise<void> {
    const m = await this.host.me(stats);
    const before = this.Account?.handle ?? null,
      was = this.Account;
    this.noBackend = !m;
    this.google = !!m?.google;
    this.apple = !!m?.apple;
    this.Account = m?.user ?? null;
    // Without stats asked for, keep the ones already shown for the same account.
    if (this.Account && !this.Account.stats && was?.stats && was.handle === this.Account.handle)
      this.Account.stats = was.stats;
    // A new Google account has no name yet: ask for one (SPEC-SHARING-ACCOUNTS R6).
    if (this.Account && !this.Account.handle && this.View === 'main') {
      this.View = 'name';
      this.input.value = '';
    }
    if (!this.Account && this.View !== 'create' && this.View !== 'code' && this.View !== 'approve')
      this.View = 'main';
    if (this.View === 'approve' && this.Account && this.ApproveCode && !this.ApproveName)
      void this.lookUpCode();
    // SIGN-IN METHODS' APPS SIGNED IN, ready before it opens (owner, 2026-11-19: it jumped as the list arrived): it
    // comes with the stats, in the one request (R15).
    if (this.Account?.apps) this.Apps = this.Account.apps;
    if (was === undefined || (this.Account?.handle ?? null) !== before || !!was !== !!this.Account)
      this.onChange();
    this.mark();
  }

  // ---- layout, from the page's top (Settings: OffsetY + 120 units + the tab's YOffset) ----
  private textW(t: string, font = App.Metrics.TxtMid) {
    const c = this.ctx();
    c.font = font;
    return c.measureText(t.toUpperCase()).width;
  }
  private bordered(label: string, right: number, top: number): Bordered {
    const unit = App.Unit,
      w = this.textW(label);
    return {
      label,
      x: right - 10 * unit - w,
      y: top,
      w: w + 10 * unit,
      h: 20 * unit,
      textX: right - 5 * unit - w,
      textY: top + 14 * unit,
    };
  }
  /** The page's width: About's text column (v1 SettingsPanel menuWidth: 4/7 of the panel, 5/7 on a phone; owner,
   * 2026-11-17, CHG-0035: it was 420 units, narrower than About's). */
  private pageW(): number {
    return pageWidth();
  }
  private layout(top: number) {
    const unit = App.Unit,
      width = App.Width,
      pw = this.pageW(),
      L = width * 0.5 - pw * 0.5,
      R = width * 0.5 + pw * 0.5,
      hw = (pw - 15 * unit) * 0.5;
    const half = (right: boolean, y: number): Box => {
      const x = right ? width * 0.5 + 7.5 * unit : L;
      return { x, y, w: hw, h: 40 * unit, cx: x + hw * 0.5 };
    };
    const full = (y: number): Box => ({ x: L, y, w: pw, h: 40 * unit, cx: width * 0.5 });
    // Signed out: one row per way to sign in, 15 units apart.
    const ways = this.ways(),
      out: Record<string, Box> = {};
    ways.forEach((k, i) => {
      out[k] = full(top + (35 + i * 55) * unit);
    });
    const below = top + (35 + ways.length * 55) * unit;
    const naming = {
      field: top + 24 * unit,
      rule: top + 66 * unit,
      submit: full(top + 85 * unit),
      back: this.bordered(COPY.back, L + this.textW(COPY.back) + 10 * unit, top + 145 * unit),
    };
    // The account's buttons under its stats (R15); 35 units under the SIGNED IN line until they arrive. DELETE ACCOUNT
    // sits top right, on the SIGNED IN line (CHG-0027: the stats need its row).
    const below2 = top + this.statsHeight() * unit;
    // DELETE ACCOUNT at the bottom right of the screen, out of the way (owner, 2026-11-18); it slides with the page.
    const screenBottom = top - ACCOUNT_TOP * unit + App.Height;
    const signedIn = {
      add: half(false, below2),
      out: half(true, below2),
      outFull: full(below2),
      del: this.bordered(COPY.deleteAccount, width - 20 * unit, screenBottom - 40 * unit),
    };
    const del = { cancel: half(false, top + 75 * unit), ok: half(true, top + 75 * unit) };
    // Signed in: the ways in on the line under the buttons, then any message.
    const methods = below2 + 62 * unit;
    // SIGN-IN METHODS: the heading and its line, a row per way in (40 units), then the ADD buttons 55 apart, then BACK.
    const rows = this.methodRows(),
      rowTop = top + 52 * unit,
      rowH = 40 * unit;
    const removable = rows.length > 1;
    const list = rows.map((row, i) => ({
      ...row,
      y: rowTop + i * rowH,
      remove: removable ? this.bordered(COPY.remove, R, rowTop + i * rowH + 10 * unit) : null,
    }));
    // APPS SIGNED IN (SHARING-0011): its heading 20 units under the ways in, then a row per plugin.
    const appsTop = rowTop + rows.length * rowH + 20 * unit,
      appRows = this.Apps.length
        ? this.Apps.map((a, i) => ({
            app: a,
            y: appsTop + 22 * unit + i * rowH,
            remove: this.bordered(COPY.remove, R, appsTop + 22 * unit + i * rowH + 10 * unit),
          }))
        : [];
    const addsTop = appRows.length
      ? appsTop + (22 + 20) * unit + appRows.length * rowH
      : rowTop + rows.length * rowH + 20 * unit;
    const adds: Record<string, Box> = {};
    this.addable().forEach((k, i) => {
      adds[k] = full(addsTop + i * 55 * unit);
    });
    const addsEnd = addsTop + this.addable().length * 55 * unit;
    // BACK at the top right, on the heading's line (owner, 2026-11-19: a button, not an arrow; the heading stays at the left).
    const methodsBack = this.bordered(COPY.back, R, top - 4 * unit);
    // A plugin's code (SHARING-0011): the code large under the line, the QR code at the right, BACK (and OPEN BROWSER
    // AGAIN) under them.
    const qrSize = 130 * unit,
      code = {
        text: top + 118 * unit,
        qr: { x: R - qrSize, y: top + 70 * unit, s: qrSize },
        waiting: top + 160 * unit,
        back: this.bordered(COPY.back, L + this.textW(COPY.back) + 10 * unit, top + 220 * unit),
        again: this.bordered(
          COPY.openAgain,
          L + this.textW(COPY.back) + 30 * unit + this.textW(COPY.openAgain) + 10 * unit,
          top + 220 * unit,
        ),
      };
    // The website approving a code: the code large, then CANCEL · APPROVE; typing one: the name field, CONTINUE, BACK.
    const approve = {
      code: top + 118 * unit,
      cancel: half(false, top + 150 * unit),
      ok: half(true, top + 150 * unit),
      submit: full(top + 85 * unit),
      back: this.bordered(COPY.back, L + this.textW(COPY.back) + 10 * unit, top + 145 * unit),
    };
    const message =
      this.View === 'methods'
        ? addsEnd + 20 * unit
        : this.View === 'code'
          ? top + 270 * unit
          : this.View === 'approve'
            ? top + 210 * unit
            : this.View === 'main' && !this.Account
              ? below + 10 * unit
              : this.View === 'main'
                ? methods + 24 * unit
                : top + 190 * unit;
    return {
      L,
      R,
      out,
      naming,
      signedIn,
      del,
      methods,
      message,
      list,
      rowH,
      adds,
      methodsBack,
      appsTop,
      appRows,
      code,
      approve,
    };
  }
  /** SIGN-IN METHODS' rows (R7a): the account's ways in, from the server's list (older servers: from the counts). */
  methodRows(): { label: string; detail: string; method: SignInMethod | null }[] {
    const a = this.Account;
    if (!a) return [];
    const name = (k: string) =>
      k === 'google' ? COPY.google1 : k === 'apple' ? COPY.apple1 : COPY.passkey1;
    const when = (t: number) =>
      new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (a.methods)
      return a.methods.map((m) => ({
        label: name(m.kind),
        detail: m.created ? COPY.added(when(m.created)) : '',
        method: m,
      }));
    return [
      ...a.providers.map((provider) => ({ label: name(provider), detail: '', method: null })),
      ...Array.from({ length: a.passkeys }, () => ({
        label: COPY.passkey1,
        detail: '',
        method: null,
      })),
    ];
  }
  /** What SIGN-IN METHODS can add: Google and Apple where the server offers them and they aren't linked, and a passkey. */
  private addable(): ('addGoogle' | 'addApple' | 'addPasskey')[] {
    const p = this.Account?.providers ?? [];
    return [
      ...(this.google && !p.includes('google') ? ['addGoogle' as const] : []),
      ...(this.apple && !p.includes('apple') ? ['addApple' as const] : []),
      'addPasskey',
    ];
  }
  /** The ways to sign in, in the owner's order: Google, Apple, then a passkey (always offered). */
  private ways(): ('google' | 'apple' | 'passkey' | 'browser')[] {
    // The plugins: a code approved on the website; the iPad app also Apple and passkeys natively (SHARING-0011).
    if (this.host.plugin)
      return this.host.plugin.native ? ['apple', 'passkey', 'browser'] : ['browser'];
    return [
      ...(this.google ? ['google' as const] : []),
      ...(this.apple ? ['apple' as const] : []),
      'passkey',
    ];
  }

  // ---- drawing (v1's own pieces) ----
  private filled(b: Box, colour: string, label: string, hover: boolean, small = false): void {
    const c = this.ctx(),
      unit = App.Unit;
    App.FillColor(c, colour);
    c.fillRect(b.x, b.y, b.w, b.h);
    if (hover) {
      c.beginPath();
      c.moveTo(b.cx, b.y + b.h + 9 * unit);
      c.lineTo(b.cx - 10 * unit, b.y + b.h - unit);
      c.lineTo(b.cx + 10 * unit, b.y + b.h - unit);
      c.closePath();
      c.fill();
    }
    App.FillColor(c, App.Palette[App.ThemeManager.Txt]);
    c.textAlign = 'center';
    c.font = small ? App.Metrics.TxtMid : App.Metrics.TxtUrl2;
    const t = label.toUpperCase(),
      w = c.measureText(t).width,
      max = b.w - 12 * unit,
      y = b.y + (small ? 25 : 29) * unit;
    if (w > max) {
      c.save();
      c.translate(b.cx, 0);
      c.scale(max / w, 1);
      c.fillText(t, 0, y);
      c.restore();
    } else c.fillText(t, b.cx, y);
  }
  private drawBordered(b: Bordered, stroke: string): void {
    const c = this.ctx();
    c.font = App.Metrics.TxtMid;
    c.textAlign = 'left';
    App.FillColor(c, App.Palette[App.ThemeManager.Txt]);
    c.fillText(b.label.toUpperCase(), b.textX, b.textY);
    App.StrokeColor(c, stroke);
    c.lineWidth = 2;
    c.beginPath();
    c.rect(b.x, b.y, b.w, b.h);
    c.stroke();
  }
  private wrap(text: string, x: number, y: number, lh: number, width: number): number {
    const c = this.ctx();
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (c.measureText(t).width > width && line) {
        c.fillText(line, x, y);
        y += lh;
        line = word;
      } else line = t;
    }
    if (line) {
      c.fillText(line, x, y);
      y += lh;
    }
    return y;
  }
  /** A sub-heading: the tab type (v1's mid type), no rule under it (owner review 2), and its italic line if any. */
  private heading(title: string, line: string, top: number, L: number): void {
    const c = this.ctx(),
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt];
    App.FillColor(c, txt);
    c.textAlign = 'left';
    c.font = App.Metrics.TxtMid;
    c.fillText(title.toUpperCase(), L, top + 10 * unit);
    if (line) {
      c.font = App.Metrics.TxtItalic2;
      this.wrap(line, L, top + 32 * unit, 14 * unit, this.pageW());
    }
  }

  /** A QR code of `url` in the square `b`: black on white whatever the theme (phone cameras read that), two
   * modules of quiet zone. */
  private qrCache: { url: string; n: number; dark: boolean[] } | null = null;
  private drawQr(url: string, b: { x: number; y: number; s: number }): void {
    if (this.qrCache?.url !== url) {
      const qRCode = qrcode(0, 'M');
      qRCode.addData(url);
      qRCode.make();
      const moduleCount = qRCode.getModuleCount(),
        dark: boolean[] = [];
      for (let y = 0; y < moduleCount; y++)
        for (let x = 0; x < moduleCount; x++) dark.push(qRCode.isDark(y, x));
      this.qrCache = { url, n: moduleCount, dark };
    }
    const { n, dark } = this.qrCache,
      c = this.ctx(),
      cell = b.s / (n + 4);
    c.fillStyle = '#ffffff';
    c.fillRect(b.x, b.y, b.s, b.s);
    c.fillStyle = '#000000';
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (dark[y * n + x])
          c.fillRect(b.x + (x + 2) * cell, b.y + (y + 2) * cell, Math.ceil(cell), Math.ceil(cell));
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
    const c = this.ctx(),
      unit = App.Unit,
      w = this.pageW() / cells.length;
    App.FillColor(c, App.Palette[App.ThemeManager.Txt]);
    c.textAlign = 'center';
    cells.forEach(([key, label], i) => {
      const x = L + w * (i + 0.5);
      c.font = App.Metrics.TxtSlider;
      c.fillText(key, x, y + 32 * unit);
      c.font = App.Metrics.TxtMid;
      c.fillText(label.toUpperCase(), x, y + 52 * unit);
    });
  }
  private drawStats(top: number, L: number, R: number): void {
    const st = this.Account?.stats,
      c = this.ctx(),
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt];
    if (!st) {
      App.AnimationsLayer.DrawSprite(c, 'loading', App.Width * 0.5, top + 25 * unit, 16, true);
      return;
    }
    // R16: the running totals, with what this browser counted and hasn't sent yet (so they move without a request).
    const p = activity.pending(),
      ms = st.playMs + p.playMs,
      hours = ms >= 3_600_000;
    const played = hours
      ? ms < 36_000_000
        ? (Math.floor(ms / 360_000) / 10).toString()
        : shortNumber(Math.floor(ms / 3_600_000))
      : shortNumber(Math.floor(ms / 60_000));
    const cells: [string, string][] = [
      [shortNumber(st.patches), COPY.patches],
      [shortNumber(st.remixes), COPY.remixes],
      [shortNumber(st.likes), COPY.likes],
      [shortNumber(st.opens), COPY.opens],
      [played, hours ? COPY.hoursPlayed : COPY.minutesPlayed],
      [shortNumber(st.blocksAdded + p.blocks), COPY.blocksAdded],
      [shortNumber(Math.floor(st.particles + p.particles)), COPY.particles],
      [shortNumber(Math.floor(st.laserTurns + p.laserTurns)), COPY.laserTurns],
    ];
    const phone = App.SettingsPhone;
    this.numberRow(cells.slice(0, 4), top + (phone ? PHONE.row1 : STATS_Y.row1) * unit, L);
    this.numberRow(cells.slice(4), top + (phone ? PHONE.row2 : STATS_Y.row2) * unit, L);
    let y = top + (phone ? PHONE.favourites : STATS_Y.favourites) * unit;
    // Favourite blocks: v1's menu icons (BlockSprites, as the blocks menu draws them) at half size over their names.
    App.FillColor(c, txt);
    c.font = App.Metrics.TxtMid;
    c.textAlign = 'left';
    c.fillText(COPY.favourites.toUpperCase(), L, y + 10 * unit);
    // The most remixed patch on the same line, at the right (a phone: on its own line under it).
    if (st.mostRemixed) {
      const n = st.mostRemixed.n,
        t = st.mostRemixed.title || 'Untitled';
      c.font = App.Metrics.TxtItalic2;
      c.textAlign = phone ? 'left' : 'right';
      c.fillText(
        `${COPY.mostRemixed}: ${t.length > 24 ? `${t.slice(0, 23)}…` : t}, ${n} ${n === 1 ? 'time' : 'times'}`,
        phone ? L : R,
        y + (phone ? 10 + PHONE.remixed : 10) * unit,
      );
      c.textAlign = 'left';
    }
    if (phone) y += PHONE.remixed * unit;
    // Six in a row; a phone: two rows of three.
    const favs = st.favourites
      .map((favourite) => ({ ...favourite, item: menuItem(favourite.type) }))
      .filter((f) => f.item)
      .slice(0, 6);
    if (!favs.length) {
      c.font = App.Metrics.TxtItalic2;
      c.fillText(COPY.noFavourites, L, y + FAV.icon * unit);
    }
    const w = this.pageW() / (phone ? 3 : 6);
    favs.forEach((fav, k) => {
      const i = phone ? k % 3 : k,
        rowY = y + (phone ? Math.floor(k / 3) * PHONE.favRow * unit : 0);
      const x = L + w * (i + 0.5);
      const iy = rowY + FAV.icon * unit;
      c.save();
      c.translate(x, iy);
      c.scale(FAV.scale, FAV.scale);
      c.translate(-x, -iy);
      App.BlockSprites.DrawSprite(
        { Ctx: c },
        new Point(x, iy),
        false,
        fav.item!.name.toLowerCase(),
      );
      c.restore();
      // Its name, on two lines when it is wider than its column (PARTICLE EMITTER beside COMPUTER KEYBOARD).
      App.FillColor(c, txt);
      c.font = App.Metrics.TxtMid;
      c.textAlign = 'center';
      const name = fav.item!.name.toUpperCase(),
        words = name.split(' ');
      if (words.length > 1 && c.measureText(name).width > w - 6 * unit) {
        const cut = Math.ceil(words.length / 2);
        c.fillText(words.slice(0, cut).join(' '), x, rowY + FAV.name * unit);
        c.fillText(words.slice(cut).join(' '), x, rowY + (FAV.name + 14) * unit);
      } else c.fillText(name, x, rowY + FAV.name * unit);
    });
  }

  draw(top: number): void {
    const c = this.ctx(),
      unit = App.Unit,
      W = App.Width,
      txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder;
    const Lo = this.layout(top),
      busy = this.Busy,
      r = this.roll;
    if (this.View === 'create' || this.View === 'name') {
      const create = this.View === 'create';
      this.heading(create ? COPY.createTitle : COPY.nameTitle, '', top, Lo.L);
      App.FillColor(c, txt);
      c.font = App.Metrics.TxtMid;
      c.textAlign = 'right';
      if (App.Metrics.Device !== Device.mobile)
        c.fillText(COPY.name.toUpperCase(), Lo.L - 15 * unit, Lo.naming.field + 28 * unit);
      App.StrokeColor(c, txt);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(Lo.L, Lo.naming.rule);
      c.lineTo(Lo.R, Lo.naming.rule);
      c.stroke();
      this.filled(
        Lo.naming.submit,
        App.Palette[busy ? 1 : menu[3]],
        busy ? COPY.working : create ? COPY.createButton : COPY.saveName,
        !busy && !!r.submit,
      );
      if (create) this.drawBordered(Lo.naming.back, App.Palette[1]);
    } else if (this.View === 'code' && this.Device) {
      // A plugin's code (SHARING-0011).
      const device = this.Device,
        plug = this.host.plugin!;
      this.heading(
        COPY.codeTitle,
        plug.canOpenBrowser ? COPY.codeOpened : COPY.codeGo(device.verifyAt),
        top,
        Lo.L,
      );
      App.FillColor(c, txt);
      c.textAlign = 'left';
      c.font = App.Metrics.TxtSlider;
      c.fillText(device.userCode, Lo.L, Lo.code.text);
      if (!plug.canOpenBrowser) this.drawQr(device.verifyUrl, Lo.code.qr); // only where the browser can't be opened (owner, 2026-11-19)
      App.AnimationsLayer.DrawSprite(
        c,
        'loading',
        Lo.L + 8 * unit,
        Lo.code.waiting - 5 * unit,
        16,
        true,
      );
      App.FillColor(c, txt);
      c.font = App.Metrics.TxtItalic2;
      c.textAlign = 'left';
      c.fillText(COPY.waiting, Lo.L + 24 * unit, Lo.code.waiting);
      this.drawBordered(Lo.code.back, App.Palette[1]);
      if (plug.canOpenBrowser)
        this.drawBordered(Lo.code.again, App.Palette[r.openAgain ? menu[3] : 1]);
    } else if (this.View === 'approve' && this.Account) {
      // The website approving a plugin's code (SHARING-0011).
      if (this.ApproveCode) {
        this.heading(
          COPY.approveTitle,
          this.ApproveName ? COPY.approveLine(this.ApproveName, this.Account.handle ?? '') : '',
          top,
          Lo.L,
        );
        App.FillColor(c, txt);
        c.textAlign = 'left';
        c.font = App.Metrics.TxtSlider;
        c.fillText(this.ApproveCode.toUpperCase(), Lo.L, Lo.approve.code);
        if (this.ApproveName) {
          this.filled(Lo.approve.cancel, App.Palette[1], COPY.cancel, !busy && !!r.approveCancel);
          this.filled(
            Lo.approve.ok,
            App.Palette[busy ? 1 : menu[3]],
            busy ? COPY.working : COPY.approve,
            !busy && !!r.approveOk,
          );
        } else
          App.AnimationsLayer.DrawSprite(
            c,
            'loading',
            W * 0.5,
            Lo.approve.ok.y + 20 * unit,
            16,
            true,
          );
      } else {
        this.heading(COPY.enterTitle, '', top, Lo.L);
        App.StrokeColor(c, txt);
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(Lo.L, Lo.naming.rule);
        c.lineTo(Lo.R, Lo.naming.rule);
        c.stroke();
        this.filled(
          Lo.naming.submit,
          App.Palette[busy ? 1 : menu[3]],
          busy ? COPY.working : COPY.continue,
          !busy && !!r.submitCode,
        );
        this.drawBordered(Lo.naming.back, App.Palette[1]);
      }
    } else if (this.View === 'methods' && this.Account) {
      this.heading(COPY.methodsTitle, COPY.methodsLine, top, Lo.L);
      const line = App.Palette[1];
      Lo.list.forEach((row, i) => {
        App.FillColor(c, txt);
        c.textAlign = 'left';
        c.font = App.Metrics.TxtMid;
        c.fillText(row.label.toUpperCase(), Lo.L, row.y + 25 * unit);
        if (row.detail) {
          c.font = App.Metrics.TxtItalic2;
          c.fillText(row.detail, Lo.L + 110 * unit, row.y + 25 * unit);
        }
        if (row.remove) this.drawBordered(row.remove, App.Palette[r[`remove${i}`] ? menu[3] : 1]);
        App.StrokeColor(c, line);
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(Lo.L, row.y + Lo.rowH);
        c.lineTo(Lo.R, row.y + Lo.rowH);
        c.stroke();
      });
      if (Lo.appRows.length) {
        App.FillColor(c, txt);
        c.textAlign = 'left';
        c.font = App.Metrics.TxtMid;
        c.fillText(COPY.apps.toUpperCase(), Lo.L, Lo.appsTop + 10 * unit);
        const when = (t: number | null) =>
          t
            ? new Date(t).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '';
        Lo.appRows.forEach((row, i) => {
          App.FillColor(c, txt);
          c.textAlign = 'left';
          c.font = App.Metrics.TxtMid;
          const name = row.app.name.toUpperCase(),
            max = Lo.R - Lo.L - 250 * unit;
          c.fillText(
            c.measureText(name).width > max ? `${name.slice(0, 28)}…` : name,
            Lo.L,
            row.y + 25 * unit,
          );
          c.font = App.Metrics.TxtItalic2;
          c.textAlign = 'right';
          c.fillText(
            COPY.lastUsed(when(row.app.lastUsed ?? row.app.created)),
            row.remove.x - 15 * unit,
            row.y + 25 * unit,
          );
          this.drawBordered(row.remove, App.Palette[r[`app${i}`] ? menu[3] : 1]);
          App.StrokeColor(c, App.Palette[1]);
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(Lo.L, row.y + Lo.rowH);
          c.lineTo(Lo.R, row.y + Lo.rowH);
          c.stroke();
        });
      }
      const colours = {
        addGoogle: menu[3],
        addApple: menu[1],
        addPasskey: menu[2 % menu.length],
      } as const;
      const labels = {
        addGoogle: COPY.addGoogle,
        addApple: COPY.addApple,
        addPasskey: this.addLabel,
      } as const;
      for (const [k, b] of Object.entries(Lo.adds) as [keyof typeof colours, Box][])
        this.filled(
          b,
          App.Palette[busy ? 1 : colours[k]],
          busy && k === 'addPasskey' ? COPY.working : labels[k],
          !busy && !!r[k],
        );
      this.drawBordered(Lo.methodsBack, App.Palette[1]);
    } else if (this.View === 'delete') {
      this.heading(COPY.deleteTitle, COPY.deleteLine, top, Lo.L);
      this.filled(Lo.del.cancel, App.Palette[1], COPY.cancel, !!r.deleteCancel);
      this.filled(
        Lo.del.ok,
        App.Palette[menu[3]],
        busy ? COPY.working : COPY.deleteButton,
        !busy && !!r.deleteOk,
      );
    } else if (this.Account) {
      App.FillColor(c, txt);
      c.textAlign = 'left';
      c.font = App.Metrics.TxtMid;
      c.fillText(COPY.stats.toUpperCase(), Lo.L, top + 10 * unit); // the corner already says who (owner, 2026-11-18)
      this.drawStats(top, Lo.L, Lo.R);
      const plugin = !!this.host.plugin; // the plugins: methods and deleting are the website's (SHARING-0011)
      // The plugins: SIGN OUT only (owner, 2026-11-19: the account's methods are on the website, and it is reached there).
      if (!plugin)
        this.filled(
          Lo.signedIn.add,
          App.Palette[busy ? 1 : menu[1]],
          COPY.methodsButton,
          !busy && !!r.methods,
          true,
        );
      this.filled(
        plugin ? Lo.signedIn.outFull : Lo.signedIn.out,
        App.Palette[busy ? 1 : menu[3]],
        COPY.signOut,
        !busy && !!r.signOut,
        true,
      );
      if (!plugin) this.drawBordered(Lo.signedIn.del, App.Palette[1]);
      App.FillColor(c, txt);
      c.font = App.Metrics.TxtItalic2;
      c.textAlign = 'left';
      c.fillText(`${COPY.methods}: ${this.methods().join(' · ')}`, Lo.L, Lo.methods);
    } else {
      App.FillColor(c, txt);
      c.font = App.Metrics.TxtMid;
      c.textAlign = 'left';
      c.fillText(
        this.noBackend
          ? COPY.noAccounts
          : this.View === 'approve'
            ? COPY.signInToApprove
            : this.host.plugin
              ? COPY.pluginLine
              : COPY.line,
        Lo.L,
        top + 10 * unit,
      );
      if (this.Account === undefined && !this.noBackend)
        App.AnimationsLayer.DrawSprite(c, 'loading', W * 0.5, top + 55 * unit, 16, true);
      else if (!this.noBackend) {
        // Each its own menu colour, as Connect's GUIDE buttons and the Patches panel's.
        const colours = {
          google: menu[3],
          apple: menu[1],
          passkey: menu[2 % menu.length],
          browser: menu[3],
        } as const;
        for (const k of this.ways())
          this.filled(
            Lo.out[k],
            App.Palette[busy ? 1 : colours[k]],
            k === 'passkey' && this.host.plugin ? COPY.passkeyApp : COPY[k],
            !busy && !!r[k],
          );
      }
    }
    if (this.Message) {
      App.FillColor(c, txt);
      c.font = App.Metrics.TxtItalic2;
      c.textAlign = 'left';
      this.wrap(this.Message, Lo.L, Lo.message, 14 * unit, this.pageW());
    }
  }

  /** The name field follows the page (it slides with the tab); shown only while naming. */
  placeField(top: number, shown: boolean): void {
    const on =
      shown &&
      (this.View === 'create' ||
        this.View === 'name' ||
        (this.View === 'approve' && !!this.Account && !this.ApproveCode));
    this.field.style.display = on ? 'block' : 'none';
    if (!on) return;
    const unit = App.Unit,
      pr = App.Metrics.PixelRatio;
    this.field.style.font = App.Metrics.TxtHeaderPR;
    this.field.style.width = `${this.pageW() / pr}px`;
    this.field.style.height = `${(unit * 42) / pr}px`;
    this.field.style.lineHeight = `${(unit * 42) / pr}px`;
    this.field.style.left = `${((App.Width - this.pageW()) * 0.5) / pr}px`;
    this.field.style.top = `${this.layout(top).naming.field / pr}px`;
  }

  // ---- input ----
  private boxes(top: number): Record<string, { x: number; y: number; w: number; h: number }> {
    const Lo = this.layout(top),
      pad = (b: Bordered) => ({
        x: b.x - 5 * App.Unit,
        y: b.y - 10 * App.Unit,
        w: b.w + 10 * App.Unit,
        h: 40 * App.Unit,
      });
    if (this.View === 'create' || this.View === 'name')
      return {
        submit: Lo.naming.submit,
        ...(this.View === 'create' ? { back: pad(Lo.naming.back) } : {}),
      };
    if (this.View === 'delete') return { deleteCancel: Lo.del.cancel, deleteOk: Lo.del.ok };
    if (this.View === 'code' && this.Device)
      return {
        codeBack: pad(Lo.code.back),
        ...(this.host.plugin?.canOpenBrowser ? { openAgain: pad(Lo.code.again) } : {}),
      };
    if (this.View === 'approve' && this.Account) {
      if (!this.ApproveCode)
        return { submitCode: Lo.naming.submit, approveBack: pad(Lo.naming.back) };
      return this.ApproveName ? { approveCancel: Lo.approve.cancel, approveOk: Lo.approve.ok } : {};
    }
    if (this.View === 'methods' && this.Account) {
      const out: Record<string, { x: number; y: number; w: number; h: number }> = {
        ...Lo.adds,
        methodsBack: pad(Lo.methodsBack),
      };
      Lo.list.forEach((row, i) => {
        if (row.remove) out[`remove${i}`] = pad(row.remove);
      });
      Lo.appRows.forEach((row, i) => {
        out[`app${i}`] = pad(row.remove);
      });
      return out;
    }
    if (this.Account && this.host.plugin) return { signOut: Lo.signedIn.outFull };
    if (this.Account)
      return {
        methods: Lo.signedIn.add,
        signOut: Lo.signedIn.out,
        deleteAccount: pad(Lo.signedIn.del),
      };
    if (this.Account === null && !this.noBackend) return { ...Lo.out };
    return {};
  }
  hit(pt: { x: number; y: number }, top: number): boolean {
    const r: Record<string, boolean> = {};
    for (const [k, b] of Object.entries(this.boxes(top)))
      r[k] = Dimensions.hitRect(b.x, b.y, b.w, b.h, pt.x, pt.y);
    this.roll = r;
    return Object.values(r).some(Boolean);
  }
  /** Tests: a control's centre in CSS px. */
  centreOf(name: string, top: number): [number, number] | null {
    const b = this.boxes(top)[name],
      pr = App.Metrics.PixelRatio;
    return b ? [(b.x + b.w / 2) / pr, (b.y + b.h / 2) / pr] : null;
  }
  press(): void {
    const r = this.roll,
      a = this.host;
    if (this.Busy) return;
    this.mark();
    if (this.host.plugin?.native && (r.apple || r.passkey)) {
      void this.nativeSignIn(r.apple ? 'apple' : 'passkey');
      return;
    }
    if (r.passkey) {
      void this.continueWithPasskey();
      return;
    }
    if (r.google) {
      a.google();
      return;
    }
    if (r.apple) {
      a.apple();
      return;
    }
    if (r.back) {
      this.View = 'main';
      this.Message = '';
      return;
    }
    if (r.submit) {
      void this.submit();
      return;
    }
    if (r.browser) {
      void this.startCode();
      return;
    }
    if (r.codeBack) {
      this.stopCode();
      this.View = 'main';
      this.Message = '';
      return;
    }
    if (r.openAgain) {
      if (this.Device) this.host.plugin?.open(this.Device.verifyUrl);
      return;
    }
    if (r.approveOk || r.approveCancel) {
      void this.answer(!!r.approveOk);
      return;
    }
    if (r.submitCode) {
      this.ApproveCode = this.input.value.trim() || null;
      this.Message = '';
      void this.lookUpCode();
      return;
    }
    if (r.approveBack) {
      this.View = 'main';
      this.ApproveCode = null;
      this.Message = '';
      return;
    }
    const app = Object.keys(r).find((k) => r[k] && /^app\d+$/.test(k));
    if (app) {
      const a = this.Apps[Number(app.slice(3))];
      if (a && this.host.apps)
        void this.action(async () => {
          await this.host.apps!.remove(a.id);
          await this.loadApps();
        }, true).then((ok) => {
          if (ok) this.Message = COPY.removed(a.name);
        });
      return;
    }
    if (r.methods) {
      this.View = 'methods';
      this.Message = '';
      return;
    }
    if (r.methodsBack) {
      this.View = 'main';
      this.Message = '';
      return;
    }
    if (r.addGoogle) {
      a.google();
      return;
    } // signed in, Google or Apple joins this account (R7a)
    if (r.addApple) {
      a.apple();
      return;
    }
    if (r.addPasskey) {
      void this.action(() => a.addPasskey(), true);
      return;
    } // its row shows it (no message: owner, 2026-11-18)
    const gone = Object.keys(r).find((k) => r[k] && /^remove\d+$/.test(k));
    if (gone) {
      const row = this.methodRows()[Number(gone.slice(6))];
      if (row?.method)
        void this.action(() => a.removeMethod(row.method!), true).then((ok) => {
          if (ok) this.Message = COPY.removed(row.label);
        });
      return;
    }
    if (r.signOut) {
      void this.action(() => a.signOut(false));
      return;
    }
    if (r.deleteAccount) {
      this.View = 'delete';
      this.Message = '';
      return;
    }
    if (r.deleteCancel) {
      this.View = 'main';
      return;
    }
    if (r.deleteOk) {
      void this.action(() => a.deleteAccount());
    }
  }
  /** ADD PASSKEY, or ADD ANOTHER PASSKEY once the account has one. */
  get addLabel(): string {
    return (this.Account?.passkeys ?? 0) > 0 ? COPY.addAnother : COPY.addPasskey;
  }
  /** The ways this account signs in (Settings › ACCOUNT, under its buttons): Google, Apple, its passkeys. */
  methods(): string[] {
    const a = this.Account!,
      out: string[] = [];
    if (a.providers.includes('google')) out.push(COPY.google1);
    if (a.providers.includes('apple')) out.push(COPY.apple1);
    if (a.passkeys > 0 || !out.length) out.push(COPY.passkeyN(a.passkeys));
    return out;
  }
  /** CONTINUE WITH PASSKEY: sign in with one the device has; none chosen (or one this site no longer knows), make a
   * new account with one instead (SPEC-SHARING-ACCOUNTS R1, R2). Browsers don't say whether the user closed the
   * dialog or had no passkey, so both lead to the name step, which has BACK. */
  private async continueWithPasskey(): Promise<void> {
    this.Busy = true;
    this.Message = '';
    try {
      await this.host.signIn();
      this.View = this.ApproveCode ? 'approve' : 'main';
      await this.refresh();
    } catch (error) {
      if (this.host.cancelled(error) || (error as { status?: number }).status === 401) {
        this.View = 'create';
        this.Message = COPY.noPasskey;
        this.input.value = '';
        setTimeout(() => {
          this.input.focus();
        }, 0);
      } else this.Message = (error as Error).message || 'That did not work. Try again.';
    } finally {
      this.Busy = false;
      this.mark();
    }
  }
  /** The iPad app: Apple or a passkey, natively; a new Apple account then picks its name (refresh asks). */
  private async nativeSignIn(kind: 'apple' | 'passkey'): Promise<void> {
    const plug = this.host.plugin!;
    this.Busy = true;
    this.Message = '';
    try {
      const r = await (kind === 'apple' ? plug.native!.apple() : plug.native!.passkey());
      plug.keep(r.key, r.user.handle);
      this.View = 'main';
      await this.refresh();
    } catch (error) {
      if ((error as Error).name !== 'AbortError')
        this.Message =
          kind === 'passkey' && (error as { status?: number }).status === 401
            ? 'This passkey is not known here. Make an account on the website first, or sign in with your browser.'
            : (error as Error).message || 'That did not work. Try again.';
    } finally {
      this.Busy = false;
      this.mark();
    }
  }

  // ---- a plugin's code (SHARING-0011) ----
  private deviceUntil = 0;
  private async startCode(): Promise<void> {
    const plug = this.host.plugin;
    if (!plug) return;
    this.Busy = true;
    this.Message = '';
    try {
      this.Device = await plug.start();
      this.deviceUntil = Date.now() + this.Device.expiresIn * 1000;
      this.View = 'code';
      if (plug.canOpenBrowser) plug.open(this.Device.verifyUrl);
      this.schedulePoll(this.Device.interval);
    } catch (error) {
      this.Message =
        (error as { status?: number }).status === undefined
          ? 'BlokDust couldn’t be reached. Check your connection and try again.'
          : (error as Error).message;
    } finally {
      this.Busy = false;
      this.mark();
    }
  }
  private schedulePoll(seconds: number): void {
    clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.pollOnce(seconds), seconds * 1000);
  }
  private stopCode(): void {
    clearTimeout(this.pollTimer);
    this.Device = null;
  }
  private async pollOnce(interval: number): Promise<void> {
    const device = this.Device,
      plug = this.host.plugin;
    if (!device || !plug || this.View !== 'code') return;
    if (Date.now() > this.deviceUntil) {
      this.stopCode();
      this.View = 'main';
      this.Message = COPY.expired;
      this.mark();
      return;
    }
    let devicePoll: Awaited<ReturnType<typeof plug.poll>>;
    try {
      devicePoll = await plug.poll(device.deviceCode);
    } catch {
      this.schedulePoll(interval);
      return;
    } // offline a moment: keep asking until it expires
    if (this.Device !== device) return; // BACK meanwhile
    if (devicePoll.status === 'approved') {
      this.stopCode();
      this.View = 'main';
      plug.keep(devicePoll.key, devicePoll.user.handle);
      await this.refresh();
    } else if (devicePoll.status === 'pending') this.schedulePoll(interval);
    else if (devicePoll.status === 'slow_down') this.schedulePoll(interval + 5);
    else {
      this.stopCode();
      this.View = 'main';
      this.Message = devicePoll.status === 'denied' ? COPY.denied : COPY.expired;
    }
    this.mark();
  }
  /** The website: APPROVE or CANCEL a plugin's code. */
  private async answer(yes: boolean): Promise<void> {
    const code = this.ApproveCode,
      apps = this.host.apps;
    if (!code || !apps || this.Busy) return;
    this.Busy = true;
    this.Message = '';
    try {
      const r = await apps.approve(code, yes);
      this.Message = yes ? COPY.approved(r.name) : COPY.turnedDown(r.name);
      this.ApproveCode = null;
      this.ApproveName = null;
      this.View = 'main';
    } catch (error) {
      this.Message = (error as Error).message || 'That did not work. Try again.';
    } finally {
      this.Busy = false;
      this.mark();
    }
  }

  /** `stay`: keep the page on show (SIGN-IN METHODS) rather than going back to the account. */
  private async action(run: () => Promise<void>, stay = false): Promise<boolean> {
    this.Busy = true;
    this.Message = '';
    try {
      await run();
      if (!stay) this.View = 'main';
      await this.refresh();
      return true;
    } catch (error) {
      if (!this.host.cancelled(error))
        this.Message = (error as Error).message || 'That did not work. Try again.';
      return false;
    } finally {
      this.Busy = false;
      this.mark();
    }
  }
  private async submit(): Promise<void> {
    const h = this.input.value.trim().toLowerCase();
    if (!h) {
      this.Message = 'Choose a name first.';
      return;
    }
    if (this.View === 'create') await this.action(() => this.host.signUp(h));
    else if (this.View === 'name') await this.action(() => this.host.setHandle(h));
  }
}
