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
  // Only what is being reported: no examples of what to report (owner, 2026-11-19: they give people
  // ideas).
  report: (title: string, by: string) => `Report ${title.toUpperCase()} by @${by}.`,
  noTarget: 'Open the patch you want to report, from the gallery or its link, then report it here.',
  signIn: 'Sign in to report a patch.',
  reported: 'Thank you. The patch was reported.',
};

/** REPORT A PATCH: the gallery patch on the stage that isn't yours, and reporting it (the gallery's
 * moderation). */
export interface FeedbackReports {
  target(): { id: string; title: string; by: string } | null;
  signedIn(): boolean;
  signIn(): void;
  report(id: string, reason: string): Promise<void>;
}

/** What FEEDBACK reads from v1's SettingsPanel, the page it draws on. */
export interface SettingsPage {
  Open: boolean;
  OffsetY: number;
  MenuItems: { YOffset: number }[];
  DrawTo: { Height: number };
  Ctx: CanvasRenderingContext2D;
  WordWrap(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    lineHeight: number,
    fitWidth: number,
  ): void;
}

const showMessage = (text: string) => {
  (App.MainScene as { message?: (text: string) => void } | undefined)?.message?.(text);
};

/** FEEDBACK uses v1's own metrics, OptionSwitch and filled GUIDE button; its choices are drawn as
 * the gallery's sorts (a word, underlined when chosen). DOM is only for accessible input. */
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
      (choice) =>
        `<button type="button" role="radio" class="feedback-choice" id="feedback-choice-${choice.key}" aria-label="${choice.label}"></button>`,
    ).join('');
    this.form.innerHTML = `<div role="radiogroup" aria-label="What is it about?">${choices}</div><span id="feedback-intro"></span><textarea id="feedback-message" name="message" aria-label="Your message" maxlength="${SUPPORT.messageChars}" placeholder="Suggestion, question or issue"></textarea>
      <input id="feedback-email" name="email" aria-label="Email (optional)" type="email" maxlength="254" autocomplete="email">
      <div class="feedback-honey" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
      <button type="button" id="feedback-include" role="switch" aria-checked="true" aria-label="Share patch and diagnostics"></button>
      <button id="feedback-send" type="submit" aria-label="Send"></button>
      <span id="feedback-status" role="status" aria-live="polite"></span>`;
    document.body.appendChild(this.form);
    const get = (id: string) => this.element(`#${id}`);
    for (const choice of CHOICES)
      get(`feedback-choice-${choice.key}`).onclick = () => {
        this.choose(choice.key);
      };
    get('feedback-include').onclick = () => {
      this.include = !this.include;
      get('feedback-include').setAttribute('aria-checked', String(this.include));
      this.redraw();
    };
    const send = this.element('#feedback-send', HTMLButtonElement);
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
      const message = this.element('#feedback-message', HTMLTextAreaElement),
        email = this.element('#feedback-email', HTMLInputElement);
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
          this.element('[name="website"]', HTMLInputElement).value,
        );
        // Sent: v1's message bar says so, not a line at the foot of the page.
        this.setStatus('');
        message.value = '';
        email.value = '';
        // for screen readers; the bar shows it
        this.element('#feedback-status').textContent = 'Message sent';
        showMessage('Message sent');
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
      this.element('#feedback-message', HTMLTextAreaElement).setCustomValidity('');
      this.setStatus('');
    };
    this.choose('suggestion');
  }
  /** The form's element for `selector`, which the constructor made (of class `kind`). */
  private element(selector: string): HTMLElement;
  private element<Kind extends HTMLElement>(selector: string, kind: new () => Kind): Kind;
  private element(selector: string, kind: new () => HTMLElement = HTMLElement): HTMLElement {
    const found = this.form.querySelector(selector);
    if (!(found instanceof kind)) throw new Error(`feedback form has no ${selector}`);
    return found;
  }
  /** SUGGESTION · BUG · REPORT A PATCH. */
  choose(choice: FeedbackChoice): void {
    this.Choice = choice;
    this.status = '';
    for (const { key } of CHOICES)
      this.element(`#feedback-choice-${key}`).setAttribute('aria-checked', String(key === choice));
    const message = this.element('#feedback-message', HTMLTextAreaElement);
    message.placeholder =
      // REPORT: its label says WHY (optional)
      choice === 'report' ? '' : choice === 'bug' ? 'What went wrong?' : 'Your idea';
    this.element('#feedback-intro').textContent = this.intro();
    this.redraw();
  }
  /** The line under the choices. */
  private intro(): string {
    if (this.Choice !== 'report') return COPY[this.Choice];
    const reports = this.reports;
    const target = reports?.target();
    if (!reports || !target) return COPY.noTarget;
    return reports.signedIn()
      ? COPY.report(target.title, target.by)
      : `${COPY.report(target.title, target.by)} ${COPY.signIn}`;
  }
  /** What REPORT A PATCH can do now: report it, sign in first, or nothing (no patch to report). */
  private reportState(): 'report' | 'signIn' | 'none' {
    if (!this.reports?.target()) return 'none';
    return this.reports.signedIn() ? 'report' : 'signIn';
  }
  private async sendReport(message: HTMLTextAreaElement): Promise<void> {
    const reports = this.reports;
    if (!reports) return;
    const state = this.reportState(),
      target = reports.target();
    if (state === 'signIn') {
      reports.signIn();
      return;
    }
    if (state !== 'report' || !target) return;
    this.sending = true;
    this.setStatus('');
    try {
      await reports.report(target.id, message.value.trim());
      message.value = '';
      this.element('#feedback-status').textContent = COPY.reported;
      showMessage(COPY.reported);
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : 'That did not work. Try again.');
    } finally {
      this.sending = false;
      this.redraw();
    }
  }
  private setStatus(value: string): void {
    this.status = value;
    this.element('#feedback-status').textContent = value;
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
    let lineCount = 1,
      line = '';
    for (const word of text.split(' ')) {
      const extended = line ? `${line} ${word}` : word;
      if (ctx.measureText(extended).width > width && line) {
        lineCount++;
        line = word;
      } else line = extended;
    }
    return lineCount;
  }
  /** Drawn on the Settings canvas under the tabs, sliding with its tab; the inputs follow, cut off
   * at the tabs' foot. The message box takes the height left (30–80 units) so SEND shows. */
  draw(panel: SettingsPage): void {
    const tab = panel.MenuItems.at(1),
      shown = panel.Open && !!tab && tab.YOffset > -panel.DrawTo.Height;
    this.form.hidden = !shown;
    if (!shown) return;
    const ctx = panel.Ctx,
      unit = App.Unit,
      pr = App.Metrics.PixelRatio;
    const pageWidth = App.SettingsPhone
      ? App.SettingsMenuWidth(App.Width)
      : // a phone: the Settings page's width (owner, 2026-11-18)
        Math.min(420 * unit, App.SettingsMenuWidth(App.Width));
    const x = (App.Width - pageWidth) / 2,
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
      const el = this.element(`#${id}`);
      el.style.display = on ? '' : 'none';
      if (!on) return;
      // the part above the tabs' foot, while sliding
      const hidden = Math.max(0, Math.min(height, clipTop - py));
      Object.assign(el.style, {
        left: `${px / pr}px`,
        top: `${py / pr}px`,
        width: `${width / pr}px`,
        height: `${height / pr}px`,
        color: txt,
        font: font.replace(/([\d.]+)px/, (_: string, px: string) => `${Number(px) / pr}px`),
        clipPath: hidden > 0 ? `inset(${hidden / pr}px 0 0 0)` : '',
        visibility: hidden >= height ? 'hidden' : '',
      });
    };
    const report = this.Choice === 'report',
      state = report ? this.reportState() : 'report';
    // REPORT A PATCH with nothing to report (or signed out): no fields
    const field = !report || state === 'report';
    // HEIGHTS (units): choices, intro, [label, message box], [email, switch: not a report], button.
    // The box gets what the window has left.
    ctx.font = App.Metrics.TxtItalic2;
    const intro = this.intro(),
      introH = this.lines(ctx, intro, pageWidth) * 16 + 14;
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
    const names = CHOICES.map((choice) => choice.label.toUpperCase()),
      ws = names.map((nameValue) => ctx.measureText(nameValue).width);
    const gap = (pageWidth - ws.reduce((a, b) => a + b, 0)) / (names.length - 1);
    let cx = x;
    CHOICES.forEach((choice, i) => {
      ctx.fillStyle = txt;
      ctx.fillText(names[i], cx, top + 10 * unit);
      if (choice.key === this.Choice) {
        ctx.strokeStyle = txt;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, top + 14 * unit);
        ctx.lineTo(cx + ws[i], top + 14 * unit);
        ctx.stroke();
      }
      place(
        `feedback-choice-${choice.key}`,
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
    panel.WordWrap(ctx, intro, x, introY, 16 * unit, pageWidth);
    place('feedback-message', x, boxY, pageWidth, boxH * unit, App.Metrics.TxtMid, field);
    place('feedback-email', x, emailY, pageWidth, 18 * unit, App.Metrics.TxtMid, !report);
    place('feedback-include', x, switchY, pageWidth, 42 * unit, App.Metrics.TxtMid, !report);
    place(
      'feedback-send',
      x,
      sendY,
      pageWidth,
      40 * unit,
      App.Metrics.TxtMid,
      !report || state !== 'none',
    );
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
      ctx.lineTo(x + pageWidth, ruleY);
      ctx.stroke();
    }
    if (!report) {
      ctx.fillText('EMAIL', x, emailLabelY);
      const emailWidth = ctx.measureText('EMAIL').width;
      ctx.font = App.Metrics.TxtItalic2;
      ctx.fillText('(optional)', x + emailWidth + 8 * unit, emailLabelY);
      // SharePanel/Patches title fields: transparent text with a single rule, never a textbox
      // outline.
      ctx.beginPath();
      ctx.moveTo(x, emailRuleY);
      ctx.lineTo(x + pageWidth, emailRuleY);
      ctx.stroke();
      ctx.font = App.Metrics.TxtMid;
      ctx.fillText('SHARE PATCH AND DIAGNOSTICS', x, switchY + 25 * unit);
      // OptionsPanel switch rows are 60u high. A 48u pair gives each half the same 24u square as
      // its separator.
      const toggle = new OptionSwitch(
        new Point(pageWidth - 48 * unit, switchY),
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
      ctx.fillRect(x, sendY, pageWidth, 40 * unit);
      if (this.hover && !this.sending) {
        const hx = x + pageWidth / 2;
        ctx.beginPath();
        ctx.moveTo(hx, sendY + 49 * unit);
        ctx.lineTo(hx + 10 * unit, sendY + 39 * unit);
        ctx.lineTo(hx - 10 * unit, sendY + 39 * unit);
        ctx.fill();
      }
      ctx.fillStyle = txt;
      ctx.font = App.Metrics.TxtUrl2;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + pageWidth / 2, sendY + 29 * unit);
    }
    ctx.font = App.Metrics.TxtItalic2;
    ctx.textAlign = 'left';
    ctx.fillStyle = txt;
    panel.WordWrap(ctx, this.status, x, sendY + 60 * unit, 16 * unit, pageWidth);
    ctx.restore();
  }
}
