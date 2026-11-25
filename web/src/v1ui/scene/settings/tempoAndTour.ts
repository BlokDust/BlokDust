// SETTINGS' last rows: the patch Tempo (web) in place of v1's Tour row (one tempo here, not a row
// on every synced block; in a DAW the host's tempo rules, so the row is empty), and the tour below.
import { App, Dimensions, Point, Size } from '../../shim.ts';
import { OptionActionButton } from '../../ported/UI/Options/OptionActionButton';
import { Slider } from '../../ported/UI/Options/OptionSlider';
import { SETTINGS_TAB, type SettingsContext } from './context.ts';
import type { AppSettingsPanel, PanelPoint, SettingsRow } from './settingsView.ts';

const tempoRow = (panel: AppSettingsPanel) =>
  panel.Options.findIndex((row) => row.Type === 'tempo');

/** The TOUR row (web, CHG-0035; its last step is about the gallery): under Tempo, where v1 would
 * have put a fifth row. 204 units (v1's rows: 60, then 48 each); taller rows on a phone. */
const tourY = () => 60 + 3 * App.SettingsRow;
const tourRow = (panel: AppSettingsPanel) =>
  panel.Options.findIndex((row) => row.Type === 'actionbutton' && row.Setting === 'tutorial');

/** The y of SETTINGS' TOUR row on screen. */
const tourTop = (panel: AppSettingsPanel, unit: number) =>
  panel.OffsetY + 120 * unit + panel.MenuItems[SETTINGS_TAB].YOffset + tourY() * unit;

function placeTempo(context: SettingsContext, row: SettingsRow): void {
  row.Value = context.host.tempo();
  row.Position.x = context.panel.linPosition(0, context.panel.Range, row.Min, row.Max, row.Value);
}

function setTempo(context: SettingsContext, x: number): void {
  const panel = context.panel,
    row = panel.Options[tempoRow(panel)];
  row.Position.x = Math.max(0, Math.min(panel.Range, x - panel.Margin));
  row.Value = Math.round(panel.linValue(0, panel.Range, row.Min, row.Max, row.Position.x));
  row.Position.x = panel.linPosition(0, panel.Range, row.Min, row.Max, row.Value);
  context.host.setTempo(row.Value);
}

/** v1's Tour row becomes Tempo plus a TOUR row on the web, and an empty row in the plugins. */
function replaceTourRow(context: SettingsContext): void {
  const rows = context.panel.Options,
    i = rows.findIndex((row) => row.Setting === 'tutorial');
  if (i < 0) return;
  if (App.IsPlugin) {
    const hidden: Pick<
      SettingsRow,
      'Type' | 'Name' | 'Selected' | 'HandleRoll' | 'Position' | 'Size' | 'Draw'
    > = {
      Type: 'hidden',
      Name: rows[i].Name,
      Selected: false,
      HandleRoll: [false, false],
      Position: rows[i].Position,
      Size: rows[i].Size,
      Draw() {
        // an empty row
      },
    };
    rows[i] = hidden as SettingsRow;
    return;
  }
  const rowSize = new Size(1, App.SettingsRow * App.Unit);
  const slider: SettingsRow = new Slider(
    new Point(0, 0),
    rowSize,
    context.panel.Margin,
    120,
    40,
    240,
    true,
    'Tempo',
    'tempo',
    false,
  );
  slider.Type = 'tempo';
  slider.DisplayConversion = (value: number) => `${Math.round(value)} BPM`;
  placeTempo(context, slider);
  rows[i] = slider;
  // v1's own row
  rows.push(new OptionActionButton(new Point(0, 0), rowSize, 'Tour', 'Launch Tour', 'tutorial'));
}

export function installTempoAndTour(context: SettingsContext): void {
  const panel = context.panel;
  const populateOptions = panel.PopulateOptions.bind(panel);
  panel.PopulateOptions = () => {
    populateOptions();
    replaceTourRow(context);
  };
  const openPanel = panel.OpenPanel.bind(panel);
  panel.OpenPanel = () => {
    const i = tempoRow(panel);
    if (i >= 0) placeTempo(context, panel.Options[i]);
    openPanel();
  };
  panel.tourButton = () => {
    const pixelRatio = App.Metrics.PixelRatio,
      unit = App.Unit;
    return tourRow(panel) < 0
      ? null
      : {
          x: (panel.Margin + panel.Range * 0.5) / pixelRatio,
          y: (tourTop(panel, unit) + 24 * unit) / pixelRatio,
        };
  };
}

export function hitTempoAndTour(context: SettingsContext, point: PanelPoint): void {
  const panel = context.panel,
    unit = App.Unit,
    rowHeight = App.SettingsRow * App.Unit;
  const i = tempoRow(panel);
  if (i >= 0) {
    const tempoTop =
      panel.OffsetY +
      120 * unit +
      panel.MenuItems[SETTINGS_TAB].YOffset +
      (60 + 2 * App.SettingsRow) * unit;
    panel._OptionsRoll[i] = Dimensions.hitRect(
      panel.Margin - 10 * unit,
      tempoTop,
      panel.Range + 20 * unit,
      rowHeight,
      point.x,
      point.y,
    );
  }
  // v1 hit-tests an action button at its own row (156): the tour's is lower
  const k = tourRow(panel);
  if (k >= 0) {
    const top = tourTop(panel, unit),
      tour = panel.Options[k];
    panel._OptionsRoll[k] = Dimensions.hitRect(
      panel.Margin - 10 * unit,
      top,
      panel.Range + 20 * unit,
      rowHeight,
      point.x,
      point.y,
    );
    tour.HandleRoll[0] = Dimensions.hitRect(
      panel.Margin + panel.Range * 0.25,
      top,
      panel.Range * 0.5,
      tour.Size.height,
      point.x,
      point.y,
    );
  }
}

/** A press on Tempo jumps its slider there, as v1's Volume does. */
export function pressTempo(context: SettingsContext, point: PanelPoint): void {
  const panel = context.panel,
    i = tempoRow(panel);
  if (i >= 0 && panel._OpenTab === SETTINGS_TAB && panel._OptionsRoll[i])
    setTempo(context, point.x);
}

export function dragTempo(context: SettingsContext, point: PanelPoint): void {
  const i = tempoRow(context.panel);
  if (i >= 0 && context.panel.Options[i].Selected) setTempo(context, point.x);
}

/** SETTINGS' TOUR row, sliding with its tab as v1's rows do. */
export function drawTourRow(context: SettingsContext): void {
  const panel = context.panel,
    k = tourRow(panel);
  if (k >= 0 && panel.MenuItems[SETTINGS_TAB].YOffset > -panel.DrawTo.Height)
    panel.Options[k].Draw(panel.Ctx, App.Unit, k, panel, tourTop(panel, App.Unit));
}
