import { App, Point, Size } from '../v1ui/shim.ts';
import { OptionSwitch } from '../v1ui/ported/UI/Options/OptionSwitch';
import { SUPPORT } from '../../../shared/support.ts';
import type { SupportClient } from './client.ts';
import './support.css';

/** FEEDBACK's choices (CHG-0041, owner 2026-11-19): what the message is about. */
export type FeedbackChoice = 'suggestion' | 'bug' | 'report';
const CHOICES: { key: FeedbackChoice; label: string }[] = [
  { key: 'suggestion', label: 'Suggestion' },
  { key: 'bug', label: 'Bug' },
  { key: 'report', label: 'Report a patch' },
];
const COPY = {
  suggestion: 'Tell us what would make BlokDust better.',
  bug: 'Tell us what went wrong and what you were doing. Sharing the patch and diagnostics helps us find it.',
  // Only what is being reported: no examples of what to report (owner, 2026-11-19: they give people ideas).
  report: (title: string, by: string) => `Report ${title.toUpperCase()} by @${by}.`,
  noTarget: 'Open the patch you want to report, from the gallery or its link, then report it here.',
  signIn: 'Sign in to report a patch.',
  reported: 'Thank you. The patch was reported.',
};

/** REPORT A PATCH: the gallery patch on the stage that isn't yours, and reporting it (the gallery's moderation). */
export interface FeedbackReports {
  target(): { id: string; title: string; by: string } | null;
  signedIn(): boolean;
  signIn(): void;
  report(id: string, reason: string): Promise<void>;
}

/** FEEDBACK uses v1's own metrics, OptionSwitch and filled GUIDE button; its choices are drawn as the gallery's sorts
 * (a word, underlined when chosen). DOM is only for accessible input. */
export class FeedbackPanel {
  private form = document.createElement('form');
  private include = true;
  private sending = false;
  private status = '';
  private hover = false;
  Choice: FeedbackChoice = 'suggestion';
  constructor(
    private client: SupportClient,
    private redraw: () => void,
    private reports: FeedbackReports | null = null,
  ) {
    this.form.id = 'feedback-panel';
    this.form.hidden = true;
    this.form.setAttribute('aria-label', 'Feedback');
    this.form.setAttribute('aria-describedby', 'feedback-intro');
    const choices = CHOICES.map(
      (c) =>
        `<button type="button" role="radio" class="feedback-choice" id="feedback-choice-${c.key}" aria-label="${c.label}"></button>`,
    ).join('');
    this.form.innerHTML = `<div role="radiogroup" aria-label="What is it about?">${choices}</div><span id="feedback-intro"></span><textarea id="feedback-message" name="message" aria-label="Your message" maxlength="${SUPPORT.messageChars}" placeholder="Suggestion, question or issue"></textarea>
      <input id="feedback-email" name="email" aria-label="Email (optional)" type="email" maxlength="254" autocomplete="email">
      <div class="feedback-honey" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
      <button type="button" id="feedback-include" role="switch" aria-checked="true" aria-label="Share patch and diagnostics"></button>
      <button id="feedback-send" type="submit" aria-label="Send"></button>
      <span id="feedback-status" role="status" aria-live="polite"></span>`;
    document.body.appendChild(this.form);
    const get = <T extends HTMLElement>(id: string) => this.form.querySelector<T>(`#${id}`)!;
    for (const c of CHOICES)
      get(`feedback-choice-${c.key}`).onclick = () => {
        this.choose(c.key);
      };
    get('feedback-include').onclick = () => {
      this.include = !this.include;
      get('feedback-include').setAttribute('aria-checked', String(this.include));
      this.redraw();
    };
    const send = get<HTMLButtonElement>('feedback-send');
    send.onmouseenter = () => {
      this.hover = true;
      this.redraw();
    };
    send.onmouseleave = () => {
      this.hover = false;
      this.redraw();
    };
    this.form.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });
    this.form.addEventListener('keyup', (event) => {
      event.stopPropagation();
    });
    this.form.onsubmit = async (submitEvent) => {
      submitEvent.preventDefault();
      if (this.sending) return;
      const message = get<HTMLTextAreaElement>('feedback-message'),
        email = get<HTMLInputElement>('feedback-email');
      if (this.Choice === 'report') {
        await this.sendReport(message);
        return;
      }
      if (!message.value.trim()) {
        message.setCustomValidity('Please enter a message.');
        message.reportValidity();
        return;
      }
      this.sending = true;
      send.disabled = true;
      this.setStatus('');
      try {
        await this.client.send(
          this.client.report(message.value.trim(), email.value.trim(), this.Choice, this.include),
          this.form.querySelector<HTMLInputElement>('[name="website"]')!.value,
        );
        // Sent: v1's message bar says so (owner, 2026-11-18: not a line at the foot of the page).
        this.setStatus('');
        message.value = '';
        email.value = '';
        this.form.querySelector('#feedback-status')!.textContent = 'Message sent'; // for screen readers; the bar shows it
        (App.MainScene as { message?: (text: string) => void } | undefined)?.message?.(
          'Message sent',
        );
      } catch (error) {
        this.setStatus(
          error instanceof Error
            ? error.message
            : 'Your support query couldn’t be sent. Please try again.',
        );
      } finally {
        this.sending = false;
        send.disabled = false;
        this.redraw();
      }
    };
    get('feedback-message').oninput = () => {
      get<HTMLTextAreaElement>('feedback-message').setCustomValidity('');
      this.setStatus('');
    };
    this.choose('suggestion');
  }
  /** SUGGESTION · BUG · REPORT A PATCH. */
  choose(choice: FeedbackChoice): void {
    this.Choice = choice;
    this.status = '';
    for (const c of CHOICES)
      this.form
        .querySelector(`#feedback-choice-${c.key}`)!
        .setAttribute('aria-checked', String(c.key === choice));
    const message = this.form.querySelector<HTMLTextAreaElement>('#feedback-message')!;
    message.placeholder =
      choice === 'report' ? '' : choice === 'bug' ? 'What went wrong?' : 'Your idea'; // REPORT: its label says WHY (optional)
    this.form.querySelector('#feedback-intro')!.textContent = this.intro();
    this.redraw();
  }
  /** The line under the choices. */
  private intro(): string {
    if (this.Choice !== 'report') return COPY[this.Choice];
    const t = this.reports?.target();
    if (!t) return COPY.noTarget;
    return this.reports!.signedIn()
      ? COPY.report(t.title, t.by)
      : `${COPY.report(t.title, t.by)} ${COPY.signIn}`;
  }
  /** What REPORT A PATCH can do now: report it, sign in first, or nothing (no patch to report). */
  private reportState(): 'report' | 'signIn' | 'none' {
    if (!this.reports?.target()) return 'none';
    return this.reports.signedIn() ? 'report' : 'signIn';
  }
  private async sendReport(message: HTMLTextAreaElement): Promise<void> {
    const state = this.reportState(),
      t = this.reports?.target();
    if (state === 'signIn') {
      this.reports!.signIn();
      return;
    }
    if (state !== 'report' || !t) return;
    this.sending = true;
    this.setStatus('');
    try {
      await this.reports!.report(t.id, message.value.trim());
      message.value = '';
      this.form.querySelector('#feedback-status')!.textContent = COPY.reported;
      (App.MainScene as { message?: (text: string) => void } | undefined)?.message?.(COPY.reported);
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : 'That did not work. Try again.');
    } finally {
      this.sending = false;
      this.redraw();
    }
  }
  private setStatus(value: string): void {
    this.status = value;
    this.form.querySelector('#feedback-status')!.textContent = value;
    this.redraw();
  }
  /** Tests: a control's centre in CSS px (`choice-<key>`, `send`). */
  centreOf(name: string): [number, number] | null {
    const el = this.form.querySelector<HTMLElement>(`#feedback-${name}`);
    if (!el || this.form.hidden || el.style.display === 'none') return null;
    const boundingClientRect = el.getBoundingClientRect();
    return [
      boundingClientRect.left + boundingClientRect.width / 2,
      boundingClientRect.top + boundingClientRect.height / 2,
    ];
  }
  /** Lines `text` takes at `width` in the current font (v1 SettingsPanel.WordWrap's rule). */
  private lines(ctx: CanvasRenderingContext2D, text: string, width: number): number {
    if (!text) return 0;
    let n = 1,
      line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > width && line) {
        n++;
        line = word;
      } else line = t;
    }
    return n;
  }
  /** Called with the Settings canvas, clipped under the tabs; it slides in and out with the FEEDBACK tab as the other
   * tabs' pages do (owner, 2026-11-18), and the inputs follow it, cut off at the tabs' foot. It fits the window
   * (owner, 2026-11-19: SEND was below a laptop's screen and GarageBand's plugin view): it starts in the gap under the
   * tabs, and the message box takes what height is left (80 units at most, 30 at least). */
  draw(panel: any): void {
    const tab = panel.MenuItems[1],
      shown = panel.Open && !!tab && tab.YOffset > -panel.DrawTo.Height;
    this.form.hidden = !shown;
    if (!shown) return;
    const ctx = panel.Ctx as CanvasRenderingContext2D,
      unit = App.Unit,
      pr = App.Metrics.PixelRatio;
    const w = App.SettingsPhone
      ? App.SettingsMenuWidth(App.Width)
      : Math.min(420 * unit, App.SettingsMenuWidth(App.Width)); // a phone: the Settings page's width (owner, 2026-11-18)
    const x = (App.Width - w) / 2,
      topU = App.SettingsPhone ? 110 : 90,
      top = panel.OffsetY + topU * unit + tab.YOffset;
    const txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder,
      clipTop = panel.OffsetY + 60 * unit;
    const place = (
      id: string,
      px: number,
      py: number,
      width: number,
      height: number,
      font = App.Metrics.TxtMid,
      on = true,
    ) => {
      const el = this.form.querySelector<HTMLElement>(`#${id}`)!;
      el.style.display = on ? '' : 'none';
      if (!on) return;
      const hidden = Math.max(0, Math.min(height, clipTop - py)); // the part above the tabs' foot, while sliding
      Object.assign(el.style, {
        left: `${px / pr}px`,
        top: `${py / pr}px`,
        width: `${width / pr}px`,
        height: `${height / pr}px`,
        color: txt,
        font: font.replace(/([\d.]+)px/, (_: string, n: string) => `${Number(n) / pr}px`),
        clipPath: hidden > 0 ? `inset(${hidden / pr}px 0 0 0)` : '',
        visibility: hidden >= height ? 'hidden' : '',
      });
    };
    const report = this.Choice === 'report',
      state = report ? this.reportState() : 'report';
    const field = !report || state === 'report'; // REPORT A PATCH with nothing to report (or signed out): no fields
    // HEIGHTS (units): the choices and the intro, then (with fields) its label and the message box, then email and
    // the switch (not for a report), then the button. The box gets what the window has left.
    ctx.font = App.Metrics.TxtItalic2;
    const intro = this.intro(),
      introH = this.lines(ctx, intro, w) * 16 + 14;
    const fixed =
      30 + introH + (field ? 26 + 12 : 0) + (report ? 0 : 100) + (report ? 20 : 12) + 40 + 12;
    const room = (App.Height - panel.OffsetY) / unit - topU - fixed;
    const boxH = field ? Math.max(30, Math.min(80, room)) : 0;
    // POSITIONS //
    const introY = top + 36 * unit,
      labelY = introY + introH * unit,
      boxY = labelY + 12 * unit,
      ruleY = boxY + (boxH + 4) * unit;
    const emailLabelY = ruleY + 22 * unit,
      emailY = emailLabelY + 6 * unit,
      emailRuleY = emailY + 26 * unit,
      switchY = emailRuleY + 12 * unit;
    const sendY = report
      ? field
        ? ruleY + 20 * unit
        : introY + introH * unit
      : switchY + 54 * unit;
    ctx.save();
    ctx.fillStyle = txt;
    ctx.strokeStyle = App.Palette[1];
    ctx.textAlign = 'left';
    // THE CHOICES: words across the page, the chosen one underlined (the gallery's sorts).
    ctx.font = App.Metrics.TxtMid;
    const names = CHOICES.map((c) => c.label.toUpperCase()),
      ws = names.map((nameValue) => ctx.measureText(nameValue).width);
    const gap = (w - ws.reduce((a, b) => a + b, 0)) / (names.length - 1);
    let cx = x;
    CHOICES.forEach((c, i) => {
      ctx.fillStyle = txt;
      ctx.fillText(names[i], cx, top + 10 * unit);
      if (c.key === this.Choice) {
        ctx.strokeStyle = txt;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, top + 14 * unit);
        ctx.lineTo(cx + ws[i], top + 14 * unit);
        ctx.stroke();
      }
      place(
        `feedback-choice-${c.key}`,
        cx - 5 * unit,
        top - 10 * unit,
        ws[i] + 10 * unit,
        30 * unit,
      );
      cx += ws[i] + gap;
    });
    ctx.strokeStyle = App.Palette[1];
    ctx.lineWidth = 2;
    ctx.fillStyle = txt;
    ctx.font = App.Metrics.TxtItalic2;
    panel.WordWrap(ctx, intro, x, introY, 16 * unit, w);
    place('feedback-message', x, boxY, w, boxH * unit, App.Metrics.TxtMid, field);
    place('feedback-email', x, emailY, w, 18 * unit, App.Metrics.TxtMid, !report);
    place('feedback-include', x, switchY, w, 42 * unit, App.Metrics.TxtMid, !report);
    place('feedback-send', x, sendY, w, 40 * unit, App.Metrics.TxtMid, !report || state !== 'none');
    ctx.font = App.Metrics.TxtMid;
    if (field) {
      ctx.fillText(report ? 'WHY' : 'YOUR MESSAGE', x, labelY);
      if (report) {
        const ww = ctx.measureText('WHY').width;
        ctx.font = App.Metrics.TxtItalic2;
        ctx.fillText('(optional)', x + ww + 8 * unit, labelY);
        ctx.font = App.Metrics.TxtMid;
      }
      ctx.beginPath();
      ctx.moveTo(x, ruleY);
      ctx.lineTo(x + w, ruleY);
      ctx.stroke();
    }
    if (!report) {
      ctx.fillText('EMAIL', x, emailLabelY);
      const emailWidth = ctx.measureText('EMAIL').width;
      ctx.font = App.Metrics.TxtItalic2;
      ctx.fillText('(optional)', x + emailWidth + 8 * unit, emailLabelY);
      // SharePanel/Patches title fields: transparent text with a single rule, never a textbox outline.
      ctx.beginPath();
      ctx.moveTo(x, emailRuleY);
      ctx.lineTo(x + w, emailRuleY);
      ctx.stroke();
      ctx.font = App.Metrics.TxtMid;
      ctx.fillText('SHARE PATCH AND DIAGNOSTICS', x, switchY + 25 * unit);
      // OptionsPanel switch rows are 60u high. A 48u pair gives each half the same 24u square as its separator.
      const toggle = new OptionSwitch(
        new Point(w - 48 * unit, switchY),
        '',
        'includeContext',
        this.include,
        new Size(48 * unit, 60 * unit * 0.43),
        false,
        'offOn',
      );
      toggle.Draw(
        ctx,
        { SliderColours: App.ThemeManager.OptionsOrder.map((i: number) => App.Palette[i]) },
        unit,
        x,
        60 * unit,
        0,
      );
    }
    if (!report || state !== 'none') {
      const label = this.sending
        ? 'SENDING…'
        : report
          ? state === 'signIn'
            ? 'SIGN IN'
            : 'REPORT'
          : 'SEND';
      ctx.fillStyle = App.Palette[this.sending ? 1 : menu[3]];
      ctx.fillRect(x, sendY, w, 40 * unit);
      if (this.hover && !this.sending) {
        const hx = x + w / 2;
        ctx.beginPath();
        ctx.moveTo(hx, sendY + 49 * unit);
        ctx.lineTo(hx + 10 * unit, sendY + 39 * unit);
        ctx.lineTo(hx - 10 * unit, sendY + 39 * unit);
        ctx.fill();
      }
      ctx.fillStyle = txt;
      ctx.font = App.Metrics.TxtUrl2;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, sendY + 29 * unit);
    }
    ctx.font = App.Metrics.TxtItalic2;
    ctx.textAlign = 'left';
    ctx.fillStyle = txt;
    panel.WordWrap(ctx, this.status, x, sendY + 60 * unit, 16 * unit, w);
    ctx.restore();
  }
}
