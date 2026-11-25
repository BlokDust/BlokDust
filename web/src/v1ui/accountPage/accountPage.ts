// Settings › SIGN IN / ACCOUNT (CHG-0023): each view's layout and the v1 pieces it is drawn with
// are in docs/architecture/account-page.md.
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
    const hits: Record<string, boolean> = {};
    for (const [k, b] of Object.entries(this.boxes(top)))
      hits[k] = Dimensions.hitRect(b.x, b.y, b.w, b.h, pt.x, pt.y);
    this.roll = hits;
    return Object.values(hits).some(Boolean);
  }
  /** Tests: a control's centre in CSS px. */
  centreOf(name: string, top: number): [number, number] | null {
    const box = (this.boxes(top) as Partial<ReturnType<typeof this.boxes>>)[name],
      pr = App.Metrics.PixelRatio;
    return box ? [(box.x + box.w / 2) / pr, (box.y + box.h / 2) / pr] : null;
  }
  press(): void {
    const rolled = this.roll,
      a = this.host;
    if (this.Busy) return;
    this.mark();
    if (this.host.plugin?.native && (rolled.apple || rolled.passkey)) {
      void this.nativeSignIn(rolled.apple ? 'apple' : 'passkey');
      return;
    }
    if (rolled.passkey) {
      void this.continueWithPasskey();
      return;
    }
    if (rolled.google) {
      a.google();
      return;
    }
    if (rolled.apple) {
      a.apple();
      return;
    }
    if (rolled.back) {
      this.View = 'main';
      this.Message = '';
      return;
    }
    if (rolled.submit) {
      void this.submit();
      return;
    }
    if (rolled.browser) {
      void this.startCode();
      return;
    }
    if (rolled.codeBack) {
      this.stopCode();
      this.View = 'main';
      this.Message = '';
      return;
    }
    if (rolled.openAgain) {
      if (this.Device) this.host.plugin?.open(this.Device.verifyUrl);
      return;
    }
    if (rolled.approveOk || rolled.approveCancel) {
      void this.answer(!!rolled.approveOk);
      return;
    }
    if (rolled.submitCode) {
      this.ApproveCode = this.input.value.trim() || null;
      this.Message = '';
      void this.lookUpCode();
      return;
    }
    if (rolled.approveBack) {
      this.View = 'main';
      this.ApproveCode = null;
      this.Message = '';
      return;
    }
    const app = Object.keys(rolled).find((k) => rolled[k] && /^app\d+$/.test(k));
    if (app) {
      const signedIn = this.Apps.at(Number(app.slice(3))),
        apps = this.host.apps;
      if (signedIn && apps)
        void this.action(async () => {
          await apps.remove(signedIn.id);
          await this.loadApps();
        }, true).then((ok) => {
          if (ok) this.Message = COPY.removed(signedIn.name);
        });
      return;
    }
    if (rolled.methods) {
      this.View = 'methods';
      this.Message = '';
      return;
    }
    if (rolled.methodsBack) {
      this.View = 'main';
      this.Message = '';
      return;
    }
    if (rolled.addGoogle) {
      a.google();
      return;
    } // signed in, Google or Apple joins this account (R7a)
    if (rolled.addApple) {
      a.apple();
      return;
    }
    if (rolled.addPasskey) {
      void this.action(() => a.addPasskey(), true);
      return;
    } // its row shows it (no message: owner, 2026-11-18)
    const gone = Object.keys(rolled).find((k) => rolled[k] && /^remove\d+$/.test(k));
    if (gone) {
      const row = this.methodRows().at(Number(gone.slice(6))),
        method = row?.method;
      if (row && method)
        void this.action(() => a.removeMethod(method), true).then((ok) => {
          if (ok) this.Message = COPY.removed(row.label);
        });
      return;
    }
    if (rolled.signOut) {
      void this.action(() => a.signOut(false));
      return;
    }
    if (rolled.deleteAccount) {
      this.View = 'delete';
      this.Message = '';
      return;
    }
    if (rolled.deleteCancel) {
      this.View = 'main';
      return;
    }
    if (rolled.deleteOk) {
      void this.action(() => a.deleteAccount());
    }
  }
}
