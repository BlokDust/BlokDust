// Release 1's changes to v1's Settings panel (CHG-0005).
import { ACCOUNT_TOP, pageWidth } from '../accountPage/metrics.ts';
import { AccountPage } from '../accountPage/accountPage.ts';
import { App, Dimensions, Point, Size } from '../shim.ts';
import { SettingsPanel } from '../ported/UI/SettingsPanel';
import { OptionActionButton } from '../ported/UI/Options/OptionActionButton';
import { Slider } from '../ported/UI/Options/OptionSlider';
import type { SceneHost } from './sceneHost.ts';
import {
  ABOUT,
  DOWNLOAD,
  IPAD_APP_STORE_URL,
  PHILLIPS,
  RELEASE,
  USAGE_STATS,
  footerLinks,
  type Release,
  setRelease,
} from './about.ts';

/**
 * Release 1 changes to v1's Settings panel (CHG-0005), made around the ported code:
 *  - Connect is restored for the support form (CHG-0036); the retired guide/social body is suppressed.
 *  - The About text is the owner's; the footer links the code on GitHub in v1's footer type, underlined on hover like
 *    v1's text links ("Chrome Recommended" is removed in the port, tools/v1/port-ui.ts). The link and v1's build line
 *    show on About only (owner review 2, 2026-11-15).
 *  - v1's Tour row is the patch Tempo on the web (owner, 2026-11-10: one tempo in Settings instead of a Tempo row on
 *    every synced block). In a DAW the host's tempo rules, so the row stays empty there. The tour itself (CHG-0035)
 *    is a row of its own under Tempo, on the web only (its last step is about the gallery).
 */
export function release1Settings(panel: SettingsPanel, host: SceneHost): void {
  const p = panel as any;
  (App.L10n as any).Attribution.about = ABOUT;
  Object.assign(
    (App.L10n as any).Attribution.phillips,
    App.NoLinks ? { blurb: PHILLIPS.blurb } : PHILLIPS,
  );
  const populate = p.Populate.bind(p);
  // DOWNLOAD (web only) is tab 3: v1 draws nothing for it, so its page is drawn here, following its tab's YOffset.
  const withDownload = !App.IsPlugin;
  // SIGN IN / ACCOUNT (CHG-0023, owner review 2026-11-15) is the last tab, drawn here the same way: tab 4 on the web,
  // tab 3 in the plugins, which have no DOWNLOAD (they sign in with a code: SHARING-0011, CHG-0039).
  const account: AccountPage | null = host.account
    ? new AccountPage(host.account, () => p.Ctx)
    : null;
  const AT = withDownload ? 4 : 3;
  p.accountPage = account;
  p.Populate = () => {
    populate({
      categories: [
        { name: 'settings' },
        { name: 'feedback' }, // FEEDBACK (CHG-0041: was CONNECT)
        { name: 'about' },
        ...(withDownload ? [{ name: 'download' }] : []),
        ...(account ? [{ name: account.tabName }] : []),
      ],
    });
  };
  if (account) {
    // The tab's name follows who is signed in (SIGN IN / ACCOUNT): lay the tabs out again, keeping each tab's state.
    const prevChange = account.onChange;
    account.onChange = () => {
      prevChange();
      const keep = (p.MenuItems as any[]).map((m) => ({
        Selected: m.Selected,
        YOffset: m.YOffset,
      }));
      p.Populate();
      (p.MenuItems as any[]).forEach((m, i) => {
        if (keep[i]) {
          m.Selected = keep[i].Selected;
          m.YOffset = keep[i].YOffset;
        }
      });
    };
    // Closing Settings (×) while DELETE ACCOUNT asks is CANCEL (owner, 2026-11-18: it opened on the question again).
    const closeSettings = p.ClosePanel.bind(p);
    // SIGN-IN METHODS too: the account comes back on its own page (owner, 2026-11-19).
    p.ClosePanel = () => {
      if (account?.View === 'delete' || account?.View === 'methods') {
        account.View = 'main';
        account.Message = '';
      }
      closeSettings();
    };
    /** Open Settings on SIGN IN / ACCOUNT (back from Google, the signed-in mark on the stage). */
    p.openAccount = () => {
      p._OpenTab = AT;
      (p.MenuItems as any[]).forEach((m, i) => {
        m.Selected = i === AT ? 1 : 0;
        m.YOffset = i === AT ? 0 : -p.DrawTo.Height;
      });
      void account.refresh();
      p.OpenPanel();
    };
  }
  // 35 units higher than the other pages (owner, 2026-11-18: the stats left too much room under the tabs).
  const accountTop = () =>
    p.OffsetY + ACCOUNT_TOP * App.Unit + (p.MenuItems[AT]?.YOffset ?? -p.DrawTo.Height);
  /** Tests: an account control's centre in CSS px. */
  p.accountCentre = (name: string) => account?.centreOf(name, accountTop()) ?? null;
  /** The DOWNLOAD page's two buttons (v1 SharePanel's halves, 420u wide) and their state. */
  /** MACOS · WINDOWS · IPAD in one row, laid out as v1 Connect's share buttons (15 units apart; owner, 2026-11-16),
   * across About's text column (owner, 2026-11-17, CHG-0035). The iPad one opens the App Store page as it is; the
   * installers carry ?source=download-page. */
  const downloads = () => {
    const unit = App.Unit,
      width = App.Width,
      y = p.OffsetY + 120 * unit + (p.MenuItems[3]?.YOffset ?? -p.DrawTo.Height) + 70 * unit;
    const pw = pageWidth(),
      bw = (pw - 30 * unit) / 3,
      left = width * 0.5 - pw * 0.5;
    // A phone (owner, 2026-11-18): one a row, the page's width, its line under it.
    const at = (i: number) =>
      App.SettingsPhone
        ? { x: left, y: y + i * 110 * unit, w: pw, h: 40 * unit, cx: left + pw * 0.5 }
        : {
            x: left + i * (bw + 15 * unit),
            y,
            w: bw,
            h: 40 * unit,
            cx: left + i * (bw + 15 * unit) + bw * 0.5,
          };
    const ipad = IPAD_APP_STORE_URL
      ? { file: '', url: IPAD_APP_STORE_URL, sha256: '', bytes: 0, store: true }
      : null;
    return [
      {
        key: 'macos' as const,
        label: 'macOS',
        release: RELEASE.macos,
        ...at(0),
        line: DOWNLOAD.macos,
      },
      {
        key: 'windows' as const,
        label: 'Windows',
        release: RELEASE.windows,
        ...at(1),
        line: DOWNLOAD.windows,
      },
      {
        key: 'ipad' as const,
        label: 'iPad',
        release: ipad as Release,
        ...at(2),
        line: DOWNLOAD.ipad,
      },
    ];
  };
  let downloadHover = -1;
  /** Tests: show the page as it will be once a release is published. */
  p.setRelease = (r: typeof RELEASE) => {
    setRelease(r);
  };
  /** Tests: the DOWNLOAD page's buttons in CSS px, and what they offer. */
  p.downloadButtons = () => {
    const pr = App.Metrics.PixelRatio;
    return downloads().map((b) => ({
      key: b.key,
      x: (b.x + b.w / 2) / pr,
      y: (b.y + b.h / 2) / pr,
      url: b.release?.url ?? null,
    }));
  };
  /** v1's word wrap (SharePanel.WordWrap): fill `text` within `width` from (x, y), `lh` apart; returns the next line's y. */
  const wrap = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    lh: number,
    width: number,
  ) => {
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > width && line) {
        ctx.fillText(line, x, y);
        y += lh;
        line = word;
      } else line = t;
    }
    if (line) {
      ctx.fillText(line, x, y);
      y += lh;
    }
    return y;
  };
  const drawDownload = () => {
    const item = p.MenuItems[3];
    if (!item || item.YOffset <= -p.DrawTo.Height) return;
    const ctx = p.Ctx as CanvasRenderingContext2D,
      unit = App.Unit,
      width = App.Width,
      txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder;
    const top = p.OffsetY + 120 * unit + item.YOffset;
    // INTRO (v1 About's body type) //
    App.FillColor(ctx, txt);
    ctx.textAlign = 'left';
    ctx.font = App.Metrics.TxtMid;
    let iy = top + 10 * unit;
    const pw = pageWidth();
    // A phone (owner, 2026-11-18): three lines, broken after "DAW," (the desktop's break left "plugin." alone).
    const intro = App.SettingsPhone
      ? [...DOWNLOAD.intro[0].split(/(?<=DAW,) /), ...DOWNLOAD.intro.slice(1)]
      : DOWNLOAD.intro;
    for (const para of intro) iy = wrap(ctx, para, width * 0.5 - pw * 0.5, iy, 16 * unit, pw);
    // MACOS · WINDOWS · IPAD (v1 SharePanel's SAVE / SAVE AS colours and a third, Connect's GUIDE button type) //
    let below = 0;
    for (const [i, b] of downloads().entries()) {
      const on = !!b.release;
      App.FillColor(ctx, App.Palette[on ? [menu[3], menu[1], menu[2]][i] : 1]);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (on && downloadHover === i) {
        ctx.beginPath();
        ctx.moveTo(b.cx, b.y + b.h + 9 * unit);
        ctx.lineTo(b.cx - 10 * unit, b.y + b.h - unit);
        ctx.lineTo(b.cx + 10 * unit, b.y + b.h - unit);
        ctx.closePath();
        ctx.fill();
      }
      App.FillColor(ctx, txt);
      ctx.textAlign = 'center';
      ctx.font = App.Metrics.TxtUrl2;
      ctx.fillText(b.label.toUpperCase(), b.cx, b.y + 29 * unit);
      ctx.textAlign = 'left';
      ctx.font = App.Metrics.TxtItalic2;
      below = Math.max(
        below,
        wrap(ctx, on ? b.line : DOWNLOAD.soon, b.x, b.y + b.h + 24 * unit, 14 * unit, b.w),
      );
    }
    // VERSION: under the longest line (the columns are narrow) //
    const y = Math.max(downloads()[0].y + 40 * unit + 80 * unit, below + 16 * unit);
    ctx.font = App.Metrics.TxtItalic2;
    ctx.textAlign = 'left';
    if (RELEASE.version && !App.SettingsPhone)
      ctx.fillText(`Version ${RELEASE.version}`, width * 0.5 - pw * 0.5, y); // a phone: About has the build (owner, 2026-11-18)
  };
  // Tempo (web) / nothing (plugin) in place of Tour, v1's last row (drawn at +156 units).
  const tempoRow = () => (p.Options as any[]).findIndex((o) => o.Type === 'tempo');
  const placeTempo = (o: any) => {
    o.Value = host.tempo();
    o.Position.x = p.linPosition(0, p.Range, o.Min, o.Max, o.Value);
  };
  const populateOptions = p.PopulateOptions.bind(p);
  p.PopulateOptions = () => {
    populateOptions();
    const opts = p.Options as any[],
      i = opts.findIndex((opt) => opt.Setting === 'tutorial');
    if (i < 0) return;
    if (App.IsPlugin) {
      opts[i] = {
        Type: 'hidden',
        Name: opts[i].Name,
        Selected: false,
        HandleRoll: [false, false],
        Position: opts[i].Position,
        Size: opts[i].Size,
        Draw() {},
      };
      return;
    }
    const slider = new Slider(
      new Point(0, 0),
      new Size(1, App.SettingsRow * App.Unit),
      p.Margin,
      120,
      40,
      240,
      true,
      'Tempo',
      'tempo',
      false,
    ) as any;
    slider.Type = 'tempo';
    slider.DisplayConversion = (v: number) => `${Math.round(v)} BPM`;
    placeTempo(slider);
    opts[i] = slider;
    opts.push(
      new OptionActionButton(
        new Point(0, 0),
        new Size(1, App.SettingsRow * App.Unit),
        'Tour',
        'Launch Tour',
        'tutorial',
      ),
    ); // v1's own row
  };
  /** The TOUR row (web): under Tempo, 48 units down, where v1 would have put a fifth row. */
  /** 204 units (v1's rows: 60, then 48 each); taller rows on a phone (App.SettingsRow). */
  const tourY = () => 60 + 3 * App.SettingsRow;
  const tourRow = () =>
    (p.Options as any[]).findIndex((o) => o.Type === 'actionbutton' && o.Setting === 'tutorial');
  const openPanel = p.OpenPanel.bind(p);
  p.OpenPanel = () => {
    const i = tempoRow();
    if (i >= 0) placeTempo(p.Options[i]);
    openPanel();
  };

  /** Which footer link the pointer is over (-1: none). */
  let linkHover = -1;
  /** The usage stats switch (About tab only): in the bottom right corner where v1 drew the build number, in its type;
   * the build number moves up a line (owner, 2026-11-16). */
  let statsHover = false;
  /** v1's line height for this type (About's blurbs). */
  const FOOT_LINE = 14;
  const statsBox = () => {
    if (!host.usageStats || p._OpenTab !== 2) return null;
    const unit = App.Unit,
      ctx = p.Ctx as CanvasRenderingContext2D;
    ctx.font = App.Metrics.TxtItalic2;
    const w = ctx.measureText(USAGE_STATS(host.usageStats.get())).width,
      y = p.OffsetY + p.DrawTo.Height - 20 * unit;
    return { x: p.DrawTo.Width - 20 * unit - w, y, w, u: unit };
  };
  /** Tests: the switch's centre in CSS px, and its words (null: not shown). */
  p.usageStatsSwitch = () => {
    const b = statsBox(),
      pr = App.Metrics.PixelRatio;
    return b
      ? {
          x: (b.x + b.w / 2) / pr,
          y: (b.y - 4 * b.u) / pr,
          label: USAGE_STATS(host.usageStats!.get()),
        }
      : null;
  };
  /** The footer links in one centred row, in v1's footer type (where it had "Chrome Recommended"), 30u apart. */
  const footer = () => {
    const unit = App.Unit,
      ctx = p.Ctx as CanvasRenderingContext2D;
    ctx.font = App.Metrics.TxtLarge;
    const ws = footerLinks().map((l) => ctx.measureText(l.label).width),
      gap = 30 * unit,
      y = p.OffsetY + p.DrawTo.Height - 20 * unit;
    let x = App.Width * 0.5 - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) * 0.5;
    const links = ws.map((w) => {
      const l = { x, w };
      x += w + gap;
      return l;
    });
    return { links, y, u: unit };
  };
  /** Tests: each footer link's centre in CSS px. */
  p.footerLinks = () => {
    const f = footer(),
      pr = App.Metrics.PixelRatio;
    return f.links.map((link, i) => ({
      label: footerLinks()[i].label,
      x: (link.x + link.w / 2) / pr,
      y: (f.y - 5 * f.u) / pr,
    }));
  };
  // About (owner, 2026-11-17, CHG-0035): no Twitter names; each website takes its line, so the three line up under
  // blurbs of different lengths. v1 draws and hit-tests the websites on one line and the Twitter names on the next, so
  // the websites are shown, and pressed, in the Twitter names' places.
  const PEOPLE = ['twyman', 'phillips', 'silverton'] as const;
  /** ABOUT on a phone (owner, 2026-11-18): the three people one a row, each v1's icon (a third larger) at the left and
   * the blurb and website at its right. v1 draws them side by side (skipped there by bd v1 port-ui). */
  const ICONS: [number, [number, number][]][][] = [
    [
      [
        4,
        [
          [0, -3],
          [1, -3],
          [2, -2],
          [1, -1],
        ],
      ],
      [
        4,
        [
          [1, 0],
          [2, -1],
          [2, 0],
        ],
      ],
      [
        3,
        [
          [0, 0],
          [0, -3],
          [1, -2],
          [1, -1],
        ],
      ],
    ],
    [
      [
        5,
        [
          [0, 0],
          [0, -1],
          [1, -2],
          [3, -2],
          [1, 0],
        ],
      ],
      [
        10,
        [
          [0, 0],
          [0, -1],
          [1, -2],
          [1, 0],
        ],
      ],
      [
        10,
        [
          [0, -3],
          [1, -3],
          [0, -2],
        ],
      ],
    ],
    [
      [
        7,
        [
          [0, 0],
          [1, -3],
          [2, -3],
          [2, -1],
          [1, 0],
        ],
      ],
      [
        9,
        [
          [0, 0],
          [0, -2],
          [1, -3],
          [1, -1],
        ],
      ],
      [
        9,
        [
          [2, 0],
          [3, 0],
          [3, -1],
        ],
      ],
    ],
  ];
  const peoplePhone = () => {
    const ctx = p.Ctx as CanvasRenderingContext2D,
      unit = App.Unit,
      pw = pageWidth(),
      L = App.Width * 0.5 - pw * 0.5,
      g = App.GridSize * 1.35;
    const top = p.OffsetY + 120 * unit + (p.MenuItems[2]?.YOffset ?? -p.DrawTo.Height);
    ctx.font = App.Metrics.TxtLarge;
    let y = top,
      line = '';
    for (const word of String(p._Attribution.about).split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > pw && line) {
        y += 16 * unit;
        line = word;
      } else line = t;
    }
    y += 16 * unit + 40 * unit;
    const tx = L + 3 * g + 20 * unit,
      tw = pw - (tx - L);
    ctx.font = App.Metrics.TxtItalic2;
    return PEOPLE.map((k, i) => {
      const a = p._Attribution[k],
        lines: string[] = [];
      line = '';
      for (const word of String(a.blurb).split(' ')) {
        const t = line ? `${line} ${word}` : word;
        if (ctx.measureText(t).width > tw && line) {
          lines.push(line);
          line = word;
        } else line = t;
      }
      if (line) lines.push(line);
      const rowTop = y,
        urlY = rowTop + 10 * unit + lines.length * 14 * unit;
      y = Math.max(rowTop + 3 * g, urlY) + 30 * unit;
      return {
        i,
        icon: ICONS[i],
        x: L,
        base: rowTop + 3 * g,
        tx,
        lines,
        rowTop,
        urlY,
        url: String(a.url ?? ''),
        urlW: ctx.measureText(String(a.url ?? '')).width,
        g,
      };
    });
  };
  const drawPeoplePhone = () => {
    if (!App.SettingsPhone || (p.MenuItems[2]?.YOffset ?? -p.DrawTo.Height) <= -p.DrawTo.Height)
      return;
    const ctx = p.Ctx as CanvasRenderingContext2D,
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt];
    for (const r of peoplePhone()) {
      for (const [pal, pts] of r.icon) {
        App.FillColor(ctx, App.Palette[pal]);
        ctx.beginPath();
        pts.forEach(([x, y], j) => {
          const px = r.x + x * r.g,
            py = r.base + y * r.g;
          if (j) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
      }
      App.FillColor(ctx, txt);
      App.StrokeColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      r.lines.forEach((line, j) => {
        ctx.fillText(line, r.tx, r.rowTop + 10 * unit + j * 14 * unit);
      });
      if (r.url && !App.NoLinks) {
        ctx.fillText(r.url, r.tx, r.urlY + 4 * unit);
        if (p._RollOvers[r.i + 1]) {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(r.tx, r.urlY + 6 * unit);
          ctx.lineTo(r.tx + r.urlW, r.urlY + 6 * unit);
          ctx.stroke();
        }
      }
    }
  };
  /** Tests: ABOUT's people on a phone (CSS px). */
  p.peoplePhone = () => {
    const pr = App.Metrics.PixelRatio;
    return App.SettingsPhone
      ? peoplePhone().map((r) => ({
          icon: [r.x / pr, (r.base - 3 * r.g) / pr],
          text: [r.tx / pr, r.rowTop / pr],
          url: r.url,
        }))
      : null;
  };
  const hitTests = p.HitTests.bind(p);
  p.HitTests = (pt: { x: number; y: number }) => {
    hitTests(pt);
    for (let i = 1; i <= 3; i++) {
      p._RollOvers[i] = !!p._RollOvers[i + 3] && !!p._Attribution[PEOPLE[i - 1]].url;
      p._RollOvers[i + 3] = false;
    }
    // A phone: the websites are where drawPeoplePhone puts them.
    if (App.SettingsPhone)
      for (const r of peoplePhone())
        p._RollOvers[r.i + 1] =
          p._OpenTab === 2 &&
          !!r.url &&
          Dimensions.hitRect(
            r.tx - 4 * App.Unit,
            r.urlY - 10 * App.Unit,
            r.urlW + 8 * App.Unit,
            20 * App.Unit,
            pt.x,
            pt.y,
          );
    // No links (hideLinks): v1 hit-tests About's websites and Twitter names (rollovers 1–6) over fixed widths.
    if (App.NoLinks) for (let i = 1; i <= 6; i++) p._RollOvers[i] = false;
    for (let i = 7; i <= 14; i++) p._RollOvers[i] = false; // Removed Connect social/guide targets.
    const f = footer();
    linkHover =
      p._OpenTab !== 2
        ? -1
        : f.links.findIndex((link) =>
            Dimensions.hitRect(
              link.x - 5 * f.u,
              f.y - 20 * f.u,
              link.w + 10 * f.u,
              30 * f.u,
              pt.x,
              pt.y,
            ),
          );
    const sb = statsBox();
    statsHover =
      !!sb &&
      Dimensions.hitRect(sb.x - 4 * sb.u, sb.y - 14 * sb.u, sb.w + 8 * sb.u, 20 * sb.u, pt.x, pt.y);
    downloadHover =
      withDownload && p._OpenTab === 3
        ? downloads().findIndex(
            (b) => !!b.release && Dimensions.hitRect(b.x, b.y, b.w, b.h, pt.x, pt.y),
          )
        : -1;
    if (account) {
      if (p._OpenTab === AT) account.hit(pt, accountTop());
      else account.hit({ x: -1e9, y: -1e9 }, accountTop());
    }
    const i = tempoRow();
    if (i >= 0)
      p._OptionsRoll[i] = Dimensions.hitRect(
        p.Margin - 10 * f.u,
        p.OffsetY + 120 * f.u + p.MenuItems[0].YOffset + (60 + 2 * App.SettingsRow) * f.u,
        p.Range + 20 * f.u,
        App.SettingsRow * App.Unit,
        pt.x,
        pt.y,
      );
    const k = tourRow(); // v1 hit-tests an action button at its own row (156): the tour's is lower
    if (k >= 0) {
      const ty = p.OffsetY + 120 * f.u + p.MenuItems[0].YOffset + tourY() * f.u,
        o = p.Options[k];
      p._OptionsRoll[k] = Dimensions.hitRect(
        p.Margin - 10 * f.u,
        ty,
        p.Range + 20 * f.u,
        App.SettingsRow * App.Unit,
        pt.x,
        pt.y,
      );
      o.HandleRoll[0] = Dimensions.hitRect(
        p.Margin + p.Range * 0.25,
        ty,
        p.Range * 0.5,
        o.Size.height,
        pt.x,
        pt.y,
      );
    }
  };
  /** Tests: the TOUR button's centre in CSS px (null: no row). */
  p.tourButton = () => {
    const pr = App.Metrics.PixelRatio,
      unit = App.Unit;
    return tourRow() < 0
      ? null
      : {
          x: (p.Margin + p.Range * 0.5) / pr,
          y: (p.OffsetY + 120 * unit + p.MenuItems[0].YOffset + tourY() * unit + 24 * unit) / pr,
        };
  };
  const setTempo = (x: number) => {
    const o = p.Options[tempoRow()];
    o.Position.x = Math.max(0, Math.min(p.Range, x - p.Margin));
    o.Value = Math.round(p.linValue(0, p.Range, o.Min, o.Max, o.Position.x));
    o.Position.x = p.linPosition(0, p.Range, o.Min, o.Max, o.Value);
    host.setTempo(o.Value);
  };
  const mouseDown = p.MouseDown.bind(p);
  p.MouseDown = (pt: { x: number; y: number }) => {
    const before = p._OpenTab;
    mouseDown(pt);
    if (account && p._OpenTab === AT && before !== AT) {
      if (account.View === 'delete' || account.View === 'methods') {
        account.View = 'main';
        account.Message = '';
      }
      void account.refresh();
    }
    if (!p.Open) return;
    if (linkHover >= 0) {
      window.open(footerLinks()[linkHover].url, '_blank');
      return;
    }
    if (statsHover && host.usageStats) {
      host.usageStats.set(!host.usageStats.get());
      return;
    }
    if (downloadHover >= 0) {
      const r = downloads()[downloadHover].release;
      if (r) window.open(r.store ? r.url : `${r.url}?source=download-page`, '_blank');
      return;
    }
    if (account && p._OpenTab === AT) {
      account.hit(pt, accountTop());
      account.press();
    }
    const i = tempoRow();
    if (i >= 0 && p._OpenTab === 0 && p._OptionsRoll[i]) setTempo(pt.x); // v1 sliders jump to the press, as Volume does
  };
  const mouseMove = p.MouseMove.bind(p);
  p.MouseMove = (pt: { x: number; y: number }) => {
    mouseMove(pt);
    const i = tempoRow();
    if (i >= 0 && p.Options[i].Selected) setTempo(pt.x);
  };
  const draw = p.Draw.bind(p);
  p.Draw = () => {
    // The build line and the GitHub link are About's (owner review 2, 2026-11-15); v1 drew the build under every tab.
    const about = p._OpenTab === 2,
      build = p._Attribution.build,
      moved = about && !!statsBox();
    if (!about || moved) p._Attribution.build = '';
    const kept = PEOPLE.map((k) => ({ ...p._Attribution[k] })),
      rolls = (p._RollOvers as boolean[]).slice(0, 7);
    for (const [i, k] of PEOPLE.entries()) {
      // the website on the Twitter line (and its hover underline)
      Object.assign(p._Attribution[k], { twitter: p._Attribution[k].url, url: '' });
      p._RollOvers[i + 4] = rolls[i + 1];
      p._RollOvers[i + 1] = false;
    }
    // Connect's v1 body (guide and social links, retired) is not drawn: its tab stays, and holds the feedback form (CHG-0036).
    const connectY = p.MenuItems[1]?.YOffset;
    if (p.MenuItems[1]) p.MenuItems[1].YOffset = -p.DrawTo.Height * 2;
    try {
      draw();
    } finally {
      if (p.MenuItems[1]) p.MenuItems[1].YOffset = connectY;
      p._Attribution.build = build;
      PEOPLE.forEach((k, i) => Object.assign(p._Attribution[k], kept[i]));
      rolls.forEach((roll, i) => {
        p._RollOvers[i] = roll;
      });
    }
    account?.placeField(
      accountTop(),
      p.Open && p._OpenTab === AT && (p.MenuItems[AT]?.YOffset ?? -1) > -p.DrawTo.Height * 0.5,
    );
    if (!p.Open) {
      host.feedback?.draw(p);
      return;
    }
    // DOWNLOAD, ACCOUNT and CONNECT slide in and out under the tabs, as SETTINGS and ABOUT do: v1's clipping box, from 60 units
    // below the tabs' top to the bottom (owner, 2026-11-16: they drew over the tabs while sliding).
    const cctx = p.Ctx as CanvasRenderingContext2D;
    cctx.save();
    cctx.beginPath();
    cctx.rect(0, p.OffsetY + 60 * App.Unit, App.Width, App.Height);
    cctx.clip();
    try {
      const k = tourRow(); // SETTINGS' TOUR row, sliding with its tab as v1's rows do
      if (k >= 0 && p.MenuItems[0].YOffset > -p.DrawTo.Height)
        p.Options[k].Draw(
          cctx,
          App.Unit,
          k,
          p,
          p.OffsetY + 120 * App.Unit + p.MenuItems[0].YOffset + tourY() * App.Unit,
        );
      if (withDownload) drawDownload(); // the plugins: tab 3 is the account (SHARING-0011)
      drawPeoplePhone();
      if (account && (p.MenuItems[AT]?.YOffset ?? -p.DrawTo.Height) > -p.DrawTo.Height)
        account.draw(accountTop());
      host.feedback?.draw(p); // CONNECT's form slides in under the tabs too (owner, 2026-11-18)
    } finally {
      cctx.restore();
    }
    if (!about) return;
    const ctx = p.Ctx as CanvasRenderingContext2D,
      f = footer(),
      txt = App.Palette[App.ThemeManager.Txt];
    App.FillColor(ctx, txt);
    App.StrokeColor(ctx, txt);
    ctx.font = App.Metrics.TxtLarge;
    ctx.textAlign = 'left';
    f.links.forEach((link, i) => {
      ctx.fillText(footerLinks()[i].label, link.x, f.y);
      if (i === linkHover) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(link.x, f.y + 2 * f.u);
        ctx.lineTo(link.x + link.w, f.y + 2 * f.u);
        ctx.stroke();
      }
    });
    const sb = statsBox();
    if (sb && host.usageStats) {
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'right';
      ctx.fillText(build, p.DrawTo.Width - 20 * sb.u, sb.y - FOOT_LINE * sb.u);
      ctx.textAlign = 'left';
      ctx.fillText(USAGE_STATS(host.usageStats.get()), sb.x, sb.y);
      if (statsHover) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sb.x, sb.y + 2 * sb.u);
        ctx.lineTo(sb.x + sb.w, sb.y + 2 * sb.u);
        ctx.stroke();
      }
    }
  };
}
