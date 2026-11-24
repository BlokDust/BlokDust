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
// Settings › SIGN IN / ACCOUNT (CHG-0023).
import { App, Dimensions } from '../shim.ts';
import { COPY } from './copy.ts';
import { type Bordered } from './metrics.ts';
import { AccountPageFlows } from './signInFlows.ts';

export class AccountPage extends AccountPageFlows {
  // ---- input ----
  protected boxes(top: number): Record<string, { x: number; y: number; w: number; h: number }> {
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
}
