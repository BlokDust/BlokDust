// Drawing the account page, view by view, and placing its name field.
import { App } from '../shim.ts';
import { Device } from '../ported/Device';
import { COPY } from './copy.ts';
import { type Box } from './metrics.ts';
import { AccountPageDrawParts } from './drawParts.ts';

export abstract class AccountPageDraw extends AccountPageDrawParts {
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
      // only where the browser can't be opened (owner, 2026-11-19)
      if (!plug.canOpenBrowser) this.drawQr(device.verifyUrl, Lo.code.qr);
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
      // the corner already says who (owner, 2026-11-18)
      c.fillText(COPY.stats.toUpperCase(), Lo.L, top + 10 * unit);
      this.drawStats(top, Lo.L, Lo.R);
      // the plugins: methods and deleting are the website's (SHARING-0011)
      const plugin = !!this.host.plugin;
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
}
