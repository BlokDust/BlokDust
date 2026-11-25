// Where the account page's controls sit, from the page's top.
import { App } from '../shim.ts';
import type { SignInMethod } from '../../account/client.ts';
import { COPY } from './copy.ts';
import { ACCOUNT_TOP, PHONE, STATS_Y, pageWidth, type Bordered, type Box } from './metrics.ts';
import { AccountPageState } from './state.ts';

export abstract class AccountPageLayout extends AccountPageState {
  // ---- layout, from the page's top (Settings: OffsetY + 120 units + the tab's YOffset) ----
  protected textW(t: string, font = App.Metrics.TxtMid) {
    const c = this.ctx();
    c.font = font;
    return c.measureText(t.toUpperCase()).width;
  }
  protected bordered(label: string, right: number, top: number): Bordered {
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
  /** The page's width: About's text column (v1 SettingsPanel menuWidth: 4/7 of the panel, 5/7 on a
   * phone; owner, 2026-11-17, CHG-0035: it was 420 units, narrower than About's). */
  protected pageW(): number {
    return pageWidth();
  }
  protected layout(top: number) {
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
    // A plugin's code (SHARING-0011): the code large under the line, the QR code at the right, BACK
    // (and OPEN BROWSER AGAIN) under them.
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
  protected addable(): ('addGoogle' | 'addApple' | 'addPasskey')[] {
    const p = this.Account?.providers ?? [];
    return [
      ...(this.google && !p.includes('google') ? ['addGoogle' as const] : []),
      ...(this.apple && !p.includes('apple') ? ['addApple' as const] : []),
      'addPasskey',
    ];
  }
  /** The ways to sign in, in the owner's order: Google, Apple, then a passkey (always offered). */
  protected ways(): ('google' | 'apple' | 'passkey' | 'browser')[] {
    // The plugins: a code approved on the website; the iPad app also Apple and passkeys natively (SHARING-0011).
    if (this.host.plugin)
      return this.host.plugin.native ? ['apple', 'passkey', 'browser'] : ['browser'];
    return [
      ...(this.google ? ['google' as const] : []),
      ...(this.apple ? ['apple' as const] : []),
      'passkey',
    ];
  }

  // ---- stats (R15) ----
  // Rows in units from the page's top, one even gap (22 units) between SIGNED IN, the two rows of numbers, FAVOURITE
  // BLOCKS and the buttons (owner, 2026-11-16: it was roomy at the top and bunched from FAVOURITE BLOCKS down).
  /** The stats' rows, in units from the page's top (the account buttons go below them). */
  protected statsHeight(): number {
    const st = this.Account?.stats;
    if (!st) return 35;
    return App.SettingsPhone ? PHONE.buttons : STATS_Y.buttons;
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
}
