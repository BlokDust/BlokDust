// About's three people (CHG-0035): no Twitter names; each website takes its own line, so the three
// line up under blurbs of different lengths. A phone shows them one a row (drawPeoplePhone).
import { pageWidth } from '../../accountPage/metrics.ts';
import { App, Dimensions } from '../../shim.ts';
import { ABOUT_TAB, type SettingsContext, tabPageTop } from './context.ts';
import { PEOPLE_ICONS, type PersonIcon } from './peopleIcons.ts';
import type { AppSettingsPanel, AttributedPerson, PanelPoint } from './settingsView.ts';
import { wrapLines } from './wordWrap.ts';

const PEOPLE = ['twyman', 'phillips', 'silverton'] as const;

interface PersonRow {
  index: number;
  icon: PersonIcon;
  /** The icon's left and baseline, and its grid size (a third larger than v1's). */
  x: number;
  base: number;
  grid: number;
  /** The blurb's left, its lines and its first line's top; the website's line and width. */
  textX: number;
  lines: string[];
  rowTop: number;
  urlY: number;
  url: string;
  urlWidth: number;
}

/** ABOUT on a phone: each person a row, v1's icon at the left and the blurb and website at its
 * right, below v1's about text. */
function peopleRows(panel: AppSettingsPanel): PersonRow[] {
  const ctx = panel.Ctx,
    unit = App.Unit,
    columnWidth = pageWidth(),
    left = App.Width * 0.5 - columnWidth * 0.5,
    grid = App.GridSize * 1.35;
  ctx.font = App.Metrics.TxtLarge;
  const aboutLines = wrapLines(ctx, panel._Attribution.about, columnWidth).length;
  let y = tabPageTop(panel, ABOUT_TAB, unit) + Math.max(aboutLines, 1) * 16 * unit + 40 * unit;
  const textX = left + 3 * grid + 20 * unit,
    textWidth = columnWidth - (textX - left);
  ctx.font = App.Metrics.TxtItalic2;
  return PEOPLE.map((key, index) => {
    const person = panel._Attribution[key],
      lines = wrapLines(ctx, person.blurb, textWidth),
      url = person.url;
    const rowTop = y,
      urlY = rowTop + 10 * unit + lines.length * 14 * unit;
    y = Math.max(rowTop + 3 * grid, urlY) + 30 * unit;
    return {
      index,
      icon: PEOPLE_ICONS[index],
      x: left,
      base: rowTop + 3 * grid,
      grid,
      textX,
      lines,
      rowTop,
      urlY,
      url,
      urlWidth: ctx.measureText(url).width,
    };
  });
}

/** The y under ABOUT's people: a phone's last row, or v1's website line (130 units below the page
 * top for the blurbs, then 56 for the line the websites take). Follows the tab as it slides. */
export function peopleBottom(panel: AppSettingsPanel): number {
  const unit = App.Unit;
  if (!App.SettingsPhone) return tabPageTop(panel, ABOUT_TAB, unit) + 190 * unit;
  const last = peopleRows(panel).at(-1);
  return last ? Math.max(last.base, last.urlY + 4 * unit) : tabPageTop(panel, ABOUT_TAB, unit);
}

export function installAboutPeople(context: SettingsContext): void {
  const panel = context.panel;
  panel.peoplePhone = () => {
    const pixelRatio = App.Metrics.PixelRatio;
    return App.SettingsPhone
      ? peopleRows(panel).map((row) => ({
          icon: [row.x / pixelRatio, (row.base - 3 * row.grid) / pixelRatio],
          text: [row.textX / pixelRatio, row.rowTop / pixelRatio],
          url: row.url,
        }))
      : null;
  };
}

/** v1 hit-tests the websites on one line (rollovers 1–3) and the Twitter names on the next (4–6):
 * the websites are pressed in the Twitter names' places, or where a phone draws them. */
export function hitAboutPeople(context: SettingsContext, point: PanelPoint): void {
  const panel = context.panel,
    rollOvers = panel._RollOvers;
  for (let i = 1; i <= 3; i++) {
    rollOvers[i] = !!rollOvers.at(i + 3) && !!panel._Attribution[PEOPLE[i - 1]].url;
    rollOvers[i + 3] = false;
  }
  if (App.SettingsPhone)
    for (const row of peopleRows(panel))
      rollOvers[row.index + 1] =
        panel._OpenTab === ABOUT_TAB &&
        !!row.url &&
        Dimensions.hitRect(
          row.textX - 4 * App.Unit,
          row.urlY - 10 * App.Unit,
          row.urlWidth + 8 * App.Unit,
          20 * App.Unit,
          point.x,
          point.y,
        );
  // No links (hideLinks): v1 hit-tests the websites and Twitter names over fixed widths.
  if (App.NoLinks) for (let i = 1; i <= 6; i++) rollOvers[i] = false;
}

/** For v1's Draw: each website on its Twitter line, with its hover underline; returns the undo. */
export function websitesOnTwitterLines(panel: AppSettingsPanel): () => void {
  const kept: AttributedPerson[] = PEOPLE.map((key) => ({ ...panel._Attribution[key] })),
    rolls = panel._RollOvers.slice(0, 7);
  for (const [i, key] of PEOPLE.entries()) {
    Object.assign(panel._Attribution[key], { twitter: panel._Attribution[key].url, url: '' });
    panel._RollOvers[i + 4] = rolls[i + 1];
    panel._RollOvers[i + 1] = false;
  }
  return () => {
    PEOPLE.forEach((key, i) => Object.assign(panel._Attribution[key], kept[i]));
    rolls.forEach((roll, i) => {
      panel._RollOvers[i] = roll;
    });
  };
}

export function drawPeoplePhone(panel: AppSettingsPanel): void {
  const aboutOffset = panel.MenuItems.at(ABOUT_TAB)?.YOffset ?? -panel.DrawTo.Height;
  if (!App.SettingsPhone || aboutOffset <= -panel.DrawTo.Height) return;
  const ctx = panel.Ctx,
    unit = App.Unit,
    textColour = App.Palette[App.ThemeManager.Txt];
  for (const row of peopleRows(panel)) {
    for (const [palette, corners] of row.icon) {
      App.FillColor(ctx, App.Palette[palette]);
      ctx.beginPath();
      corners.forEach(([x, y], j) => {
        const cornerX = row.x + x * row.grid,
          cornerY = row.base + y * row.grid;
        if (j) ctx.lineTo(cornerX, cornerY);
        else ctx.moveTo(cornerX, cornerY);
      });
      ctx.closePath();
      ctx.fill();
    }
    App.FillColor(ctx, textColour);
    App.StrokeColor(ctx, textColour);
    ctx.font = App.Metrics.TxtItalic2;
    ctx.textAlign = 'left';
    row.lines.forEach((line, j) => {
      ctx.fillText(line, row.textX, row.rowTop + 10 * unit + j * 14 * unit);
    });
    if (row.url && !App.NoLinks) {
      ctx.fillText(row.url, row.textX, row.urlY + 4 * unit);
      if (panel._RollOvers[row.index + 1]) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(row.textX, row.urlY + 6 * unit);
        ctx.lineTo(row.textX + row.urlWidth, row.urlY + 6 * unit);
        ctx.stroke();
      }
    }
  }
}
