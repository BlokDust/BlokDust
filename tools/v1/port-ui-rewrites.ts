// bd v1 port-ui's text rewrites: the only changes made to v1's UI source as it is ported
// (tools/v1/port-ui.ts).
const CHROME_FOOTER =
  '            // CHROME RECOMMENDED //\n            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);\n            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);\n            ctx.font = largeType;\n            ctx.textAlign = "center";\n            ctx.fillText(\'Chrome Recommended\', App.Width*0.5, this.OffsetY + this.DrawTo.Height - (20 * units));\n\n            ctx.lineWidth = 2;\n            ctx.beginPath();\n            ctx.moveTo((App.Width*0.5) - (60*units), this.OffsetY + this.DrawTo.Height - (27 * units));\n            ctx.lineTo((App.Width*0.5) - (63.89*units), this.OffsetY + this.DrawTo.Height - (20 * units));\n            ctx.lineTo((App.Width*0.5) - (56.11*units), this.OffsetY + this.DrawTo.Height - (20 * units));\n            ctx.closePath();\n            ctx.stroke();\n\n';
const SPLASH_CHROME =
  '        // CHROME RECOMMENDED //\n        var chY = (this.LoadOffset * App.Height);\n\n        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);\n        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);\n        ctx.font = App.Metrics.TxtLarge;\n        ctx.textAlign = "center";\n        ctx.fillText(\'Chrome Recommended\', App.Width*0.5, chY + this.DrawTo.Height - (20 * units));\n\n        ctx.lineWidth = 2;\n        ctx.beginPath();\n        ctx.moveTo((App.Width*0.5) - (60*units), chY + this.DrawTo.Height - (27 * units));\n        ctx.lineTo((App.Width*0.5) - (63.89*units), chY + this.DrawTo.Height - (20 * units));\n        ctx.lineTo((App.Width*0.5) - (56.11*units), chY + this.DrawTo.Height - (20 * units));\n        ctx.closePath();\n        ctx.stroke();\n';
const SPLASH_TRIANGLE =
  '        ctx.lineTo((App.Width*0.5) + (this._Scale*0.5),by + (App.Height*0.5));\n        ctx.fill();\n';
const SPLASH_TRIANGLE_START =
  '        ctx.lineTo((App.Width*0.5) + (this._Scale*0.5),by + (App.Height*0.5));\n        ctx.fill();\n\n        // START (owner, 2026-11-11): the word under v1\'s play triangle, in v1\'s header type //\n        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);\n        ctx.textAlign = "center";\n        ctx.font = App.Metrics.TxtHeader;\n        ctx.fillText("START", App.Width*0.5, by + (App.Height*0.5) + this._Scale + (50*units));\n';
// The only text changes to ported files, each for a stated reason (applied verbatim; the port fails
// if one no longer matches, so a v1 pin bump can't silently drop it).
export const REWRITES: Record<
  string,
  ([string, string, string] | [string, string, string, 'all'])[]
> = {
  // DATA-0005 / CHG-0003: the sample panel searches Freesound (SoundCloud's API is gone).
  'UI/SoundcloudPanel.ts': [
    ['searchLine: "Search SoundCloud"', 'searchLine: "Search Freesound"', 'provider name'],
  ],
  // Owner (2026-11-10, CHG-0005): no "Chrome Recommended" footer (v2 runs alike in every browser
  // and in the plugin).
  'UI/SettingsPanel.ts': [
    [CHROME_FOOTER, '', 'Chrome Recommended footer'],
    // Owner (2026-11-18, CHG-0037): phone page nearly screen-wide (App.SettingsMenuWidth), tabs
    // share the width left of the cross, rows taller (App.SettingsRow); desktop keeps v1's sizes.
    [
      'var menuWidth = (this.DrawTo.Width/7)*5;',
      'var menuWidth = App.SettingsMenuWidth(this.DrawTo.Width);',
      'phone page width',
      'all',
    ],
    [
      '            catWidth[i] = ctx.measureText(json.categories[i].name.toUpperCase()).width + (gutter*units);',
      '            catWidth[i] = App.SettingsPhone ? App.SettingsTabsWidth(this.DrawTo.Width) / n : ctx.measureText(json.categories[i].name.toUpperCase()).width + (gutter*units);',
      'phone tabs share the width',
    ],
    [
      '            ctx.moveTo(dx - halfWidth,tabY + (60*units)-1);\n            ctx.lineTo(dx + halfWidth,tabY + (60*units)-1);',
      '            ctx.moveTo(App.SettingsPhone ? 0 : dx - halfWidth,tabY + (60*units)-1);\n            ctx.lineTo(App.SettingsPhone ? App.Width : dx + halfWidth,tabY + (60*units)-1);',
      "phone: the rule under the tabs is the screen's width",
    ],
    [
      '        var catX = ((this.DrawTo.Width*0.5) - (menuWidth*0.5));',
      '        var catX = App.SettingsPhone ? 0 : ((this.DrawTo.Width*0.5) - (menuWidth*0.5));',
      'phone tabs from the left edge',
    ],
    ['(108*units)', '((60+App.SettingsRow)*units)', 'phone rows taller', 'all'],
    ['(156*units)', '((60+2*App.SettingsRow)*units)', 'phone rows taller', 'all'],
    ['48*App.Unit', 'App.SettingsRow*App.Unit', 'phone rows taller', 'all'],
    // ABOUT's three people side by side don't fit a phone: scene.ts draws them one a row there
    // (owner, 2026-11-18).
    [
      '            var xs = [x1,x2,x3];',
      '            if (!App.SettingsPhone) {\n            var xs = [x1,x2,x3];',
      'phone: people drawn by scene.ts',
    ],
    [
      '            // END TAB 3 //',
      '            }\n            // END TAB 3 //',
      'phone: people drawn by scene.ts',
    ],
  ],
  // UI-0016 (CHG-0040): a row drawn by v2 (the note bars) is declared as a slider with its own
  // height in units.
  'UI/OptionsPanel.ts': [
    [
      '            if (json.parameters[i].type == "slider") {\n                getHeight += 48;\n                optionHeight[i] = 48 * units;',
      '            if (json.parameters[i].type == "slider") {\n                var rowH = (json.parameters[i].props && json.parameters[i].props.height) || 48;\n                getHeight += rowH;\n                optionHeight[i] = rowH * units;',
      'slider rows can be taller (note bars)',
    ],
  ],
  // CHG-0049 (owner, 2026-11-27): a dragged slider's value stays readable over its own bar when
  // text and slider colours match (shim.ts SliderValueText).
  'UI/Options/OptionSlider.ts': [
    [
      '            ctx.fillText(string, x + panel.Margin + (25 * units), y + (height * 0.5) + (headerType * 0.35));',
      '            App.SliderValueText(ctx, string, x + panel.Margin + (25 * units), y + (height * 0.5) + (headerType * 0.35), origin + offset, x + panel.Margin, y, height, col);',
      'value readable over its bar',
    ],
  ],
  'UI/Options/OptionMeter.ts': [
    [
      '        var height = 48*units;',
      '        var height = App.SettingsRow*units;',
      'phone rows taller (Settings only)',
    ],
  ],
  // v1 sized by width alone, so a short wide view (plugin above GarageBand's iPad keyboard) got
  // panels taller than the view: past App.MaxAspect the unit follows height (owner, 2026-11-16).
  'Metrics.ts': [
    [
      'App.Unit = (width/this._ScreenDivision) * this.PixelRatio;',
      'App.Unit = (Math.min(width, height * App.MaxAspect)/this._ScreenDivision) * this.PixelRatio;',
      'unit capped for short wide views',
    ],
  ],
  'Splash.ts': [
    [SPLASH_CHROME, '', 'Chrome Recommended footer'],
    // Owner (2026-11-11): START under the play triangle (v1's button had no word).
    [SPLASH_TRIANGLE, SPLASH_TRIANGLE_START, 'START under the button'],
    // Owner (2026-11-14): the app is called BLOKDUST 2.
    ['this.Ctx.fillText("BLOKDUST",dx,', 'this.Ctx.fillText("BLOKDUST 2",dx,', 'title'],
    // Owner (2026-11-17, CHG-0035): on a phone held upright the title nearly touched the edges; it
    // is at most 80% of the screen's width (v1's size wherever that fits).
    [
      '        var headerType = 100*units;\n',
      '        var headerType = 100*units;\n        this.Ctx.font = "200 " + headerType + "px Dosis";\n' +
        '        headerType = Math.min(headerType, headerType * App.Width * 0.8 / this.Ctx.measureText("BLOKDUST 2").width);\n',
      'title fits a phone',
    ],
  ],
  // Owner (2026-11-17, CHG-0035): zoom out one step further, to 0.15 (v1 stopped at 0.25); 1 is
  // then the fourth slot.
  'UI/ZoomButtons.ts': [
    [
      'this._ZoomSlots = [0.25,0.5,1,2,4];\n        this.CurrentSlot = 2;',
      'this._ZoomSlots = [0.15,0.25,0.5,1,2,4];\n        this.CurrentSlot = 3;',
      'zoom slots',
    ],
    [
      'display = display || false;\n        this.CurrentSlot = 2;',
      'display = display || false;\n        this.CurrentSlot = 3;',
      'zoom reset slot',
    ],
  ],
  'UI/Header.ts': [
    [
      'this.Ctx.fillText("BLOKDUST", App.Width*0.5,',
      'this.Ctx.fillText("BLOKDUST 2", App.Width*0.5,',
      'title (phone)',
    ],
    ['this.Ctx.fillText("BLOKDUST", (20 +', 'this.Ctx.fillText("BLOKDUST 2", (20 +', 'title'],
    // Owner (GarageBand, 2026-11-20): in a short wide view blocks draw small (unit follows height);
    // the drop-down's height (not its spacing across) follows too: App.MenuDrop (shim.ts).
    [
      'var point = new Point(0,((this.Height + (this.DropDownHeight*0.5))*units) + rowOffset);\n                var size = new Size(this.DropDownHeight*units,this.DropDownHeight*units);',
      'var point = new Point(0,((this.Height + (App.MenuDrop(this.DropDownHeight)*0.5))*units) + rowOffset);\n                var size = new Size(this.DropDownHeight*units,App.MenuDrop(this.DropDownHeight)*units);',
      'drop height: items',
    ],
    [
      'this.DelayTo(this,this.DropDownHeight,500,0,"DropDown");',
      'this.DelayTo(this,App.MenuDrop(this.DropDownHeight),500,0,"DropDown");',
      'drop height: open',
    ],
    [
      'this.DelayTo(item,this.DropDownHeight,350,0,"InfoOffset");',
      'this.DelayTo(item,App.MenuDrop(this.DropDownHeight),350,0,"InfoOffset");',
      'drop height: info',
    ],
    [
      'item.BackHover = Dimensions.hitRect(item.Position.x - ((this.DropDownHeight*0.5)*units), item.Position.y - ((this.DropDownHeight*0.5)*units), this.DropDownHeight*units, this.DropDownHeight*units, point.x, point.y);',
      'item.BackHover = Dimensions.hitRect(item.Position.x - ((this.DropDownHeight*0.5)*units), item.Position.y - ((App.MenuDrop(this.DropDownHeight)*0.5)*units), this.DropDownHeight*units, App.MenuDrop(this.DropDownHeight)*units, point.x, point.y);',
      'drop height: info back',
    ],
  ],
};
