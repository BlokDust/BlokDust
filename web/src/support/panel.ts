import { App, Point, Size } from '../v1ui/shim.ts';
import { Device } from '../v1ui/ported/Device';
import { OptionSwitch } from '../v1ui/ported/UI/Options/OptionSwitch';
import { SUPPORT } from '../../../shared/support.ts';
import type { SupportClient } from './client.ts';
import './support.css';

const INTRO = 'Suggest a feature, report a bug, or tell us if something isn’t right.';

/** Connect uses v1's own metrics, OptionSwitch and filled GUIDE button. DOM is only for accessible input. */
export class FeedbackPanel {
  private form = document.createElement('form');
  private include = true;
  private sending = false;
  private status = '';
  private hover = false;
  constructor(private client: SupportClient, private redraw: () => void) {
    this.form.id = 'feedback-panel';
    this.form.hidden = true;
    this.form.setAttribute('aria-label', 'Feedback & support');
    this.form.setAttribute('aria-describedby', 'feedback-intro');
    this.form.innerHTML = `<span id="feedback-intro">${INTRO}</span><textarea id="feedback-message" name="message" aria-label="Your message" required maxlength="${SUPPORT.messageChars}" placeholder="Suggestion, question or issue"></textarea>
      <input id="feedback-email" name="email" aria-label="Email (optional)" type="email" maxlength="254" autocomplete="email">
      <div class="feedback-honey" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
      <button type="button" id="feedback-include" role="switch" aria-checked="true" aria-label="Share patch and diagnostics"></button>
      <button id="feedback-send" type="submit" aria-label="Send"></button>
      <span id="feedback-status" role="status" aria-live="polite"></span>`;
    document.body.appendChild(this.form);
    const get = <T extends HTMLElement>(id: string) => this.form.querySelector<T>(`#${id}`)!;
    get('feedback-include').onclick = () => {
      this.include = !this.include;
      get('feedback-include').setAttribute('aria-checked', String(this.include)); this.redraw();
    };
    const send = get<HTMLButtonElement>('feedback-send');
    send.onmouseenter = () => { this.hover = true; this.redraw(); };
    send.onmouseleave = () => { this.hover = false; this.redraw(); };
    this.form.addEventListener('keydown', e => e.stopPropagation());
    this.form.addEventListener('keyup', e => e.stopPropagation());
    this.form.onsubmit = async e => {
      e.preventDefault(); if (this.sending) return;
      const message = get<HTMLTextAreaElement>('feedback-message'), email = get<HTMLInputElement>('feedback-email');
      if (!message.value.trim()) { message.setCustomValidity('Please enter a message.'); message.reportValidity(); return; }
      this.sending = true; send.disabled = true; this.setStatus('Sending…');
      try {
        await this.client.send(this.client.report(message.value.trim(), email.value.trim(), 'feedback', this.include), this.form.querySelector<HTMLInputElement>('[name="website"]')!.value);
        this.setStatus('Thank you'); message.value = ''; email.value = '';
      } catch (error) { this.setStatus(error instanceof Error ? error.message : 'Your support query couldn’t be sent. Please try again.'); }
      finally { this.sending = false; send.disabled = false; this.redraw(); }
    };
    get('feedback-message').oninput = () => { get<HTMLTextAreaElement>('feedback-message').setCustomValidity(''); this.setStatus(''); };
  }
  private setStatus(value: string): void {
    this.status = value; this.form.querySelector('#feedback-status')!.textContent = value; this.redraw();
  }
  /** Called with the Settings canvas; inputs follow the actual Connect tab's slide/resize/theme. */
  draw(panel: any): void {
    const tab = panel.MenuItems[1], shown = panel.Open && panel._OpenTab === 1 && tab?.YOffset > -1;
    this.form.hidden = !shown;
    if (!shown) return;
    const ctx = panel.Ctx as CanvasRenderingContext2D, u = App.Unit, pr = App.Metrics.PixelRatio;
    const w = Math.min(420 * u, App.Width * (App.Metrics.Device === Device.mobile ? 5 : 4) / 7);
    const x = (App.Width - w) / 2, y = panel.OffsetY + 120 * u + tab.YOffset;
    const txt = App.Palette[App.ThemeManager.Txt], menu = App.ThemeManager.MenuOrder;
    const place = (id: string, px: number, py: number, width: number, height: number, font = App.Metrics.TxtMid) => {
      const el = this.form.querySelector<HTMLElement>(`#${id}`)!;
      Object.assign(el.style, { left: `${px / pr}px`, top: `${py / pr}px`, width: `${width / pr}px`, height: `${height / pr}px`, color: txt,
        font: font.replace(/([\d.]+)px/, (_: string, n: string) => `${Number(n) / pr}px`) });
    };
    place('feedback-message', x, y + 46 * u, w, 80 * u);
    place('feedback-email', x, y + 174 * u, w, 18 * u);
    place('feedback-include', x, y + 215 * u, w, 42 * u);
    place('feedback-send', x, y + 270 * u, w, 40 * u);
    ctx.save(); ctx.fillStyle = txt; ctx.strokeStyle = App.Palette[1]; ctx.textAlign = 'left'; ctx.font = App.Metrics.TxtMid;
    ctx.font = App.Metrics.TxtItalic2; panel.WordWrap(ctx, INTRO, x, y, 16 * u, w);
    ctx.font = App.Metrics.TxtMid; ctx.fillText('YOUR MESSAGE', x, y + 32 * u);
    ctx.fillText('EMAIL', x, y + 160 * u);
    const emailWidth = ctx.measureText('EMAIL').width;
    ctx.font = App.Metrics.TxtItalic2; ctx.fillText('(optional)', x + emailWidth + 8 * u, y + 160 * u);
    // SharePanel/Patches title fields: transparent text with a single rule, never a textbox outline.
    ctx.beginPath(); ctx.moveTo(x, y + 138 * u); ctx.lineTo(x + w, y + 138 * u);
    ctx.moveTo(x, y + 202 * u); ctx.lineTo(x + w, y + 202 * u); ctx.stroke();
    ctx.font = App.Metrics.TxtMid; ctx.fillText('SHARE PATCH AND DIAGNOSTICS', x, y + 240 * u);
    // OptionsPanel switch rows are 60u high. A 48u pair gives each half the same 24u square as its separator.
    const toggle = new OptionSwitch(new Point(w - 48 * u, y + 215 * u), '', 'includeContext', this.include, new Size(48 * u, 60 * u * .43), false, 'offOn');
    toggle.Draw(ctx, { SliderColours: App.ThemeManager.OptionsOrder.map((i: number) => App.Palette[i]) }, u, x, 60 * u, 0);
    ctx.fillStyle = App.Palette[this.sending ? 1 : menu[3]]; ctx.fillRect(x, y + 270 * u, w, 40 * u);
    if (this.hover && !this.sending) { const cx = x + w / 2; ctx.beginPath(); ctx.moveTo(cx, y + 319 * u); ctx.lineTo(cx + 10 * u, y + 309 * u); ctx.lineTo(cx - 10 * u, y + 309 * u); ctx.fill(); }
    ctx.fillStyle = txt; ctx.font = App.Metrics.TxtUrl2; ctx.textAlign = 'center'; ctx.fillText(this.sending ? 'SENDING…' : 'SEND', x + w / 2, y + 299 * u);
    ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
    panel.WordWrap(ctx, this.status, x, y + 348 * u, 16 * u, w);
    ctx.restore();
  }
}
