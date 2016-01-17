import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import Size = minerva.Size;
import {Device} from '../Device';
import {IApp} from '../IApp';
import {MainScene} from './../MainScene';
import {MenuCategory} from './MenuCategory';
import {ThemeSelector} from './Options/OptionColorTheme';
import {Version} from './../_Version';
import {Option} from './Options/Option';
import {Slider} from './Options/OptionSlider';
import {OptionMeter} from './Options/OptionMeter';
import {OptionActionButton} from './Options/OptionActionButton';

declare var App: IApp;

export class SettingsPanel extends DisplayObject{

    public Open: boolean;
    public OffsetY: number;
    //public TabOffset: number[];
    private _RollOvers: boolean[];
    private _Attribution: any;
    public MenuItems: MenuCategory[] = [];
    private _MenuCols: number[];
    public MenuJson: any;
    public Height: number;
    private _OpenTab: number;
    private _VersionNumber: string;
    private _ThemeSelector: ThemeSelector;
    public Options: Option[];
    private _OptionsRoll: boolean[];
    public Range: number;
    public Margin: number;
    public SliderColours: string[];
    private _CopyJson: any;

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this.Open = false;
        this.OffsetY = -this.DrawTo.Height;

        this._RollOvers = [];
        this.Height = 60;
        this.MenuItems = [];
        this._MenuCols = [9,5,7,4,3];
        this._OpenTab = 0;
        this._VersionNumber = Version;
        //console.log(Version);

        // OPTIONS //
        this.Range = 0;
        this.Margin = 0;
        this.SliderColours = [];
        this.Options = [];
        this._OptionsRoll = [];

        this._Attribution = App.L10n.Attribution;
        this._Attribution.build = String.format(this._Attribution.build, this._VersionNumber);

        this.MenuJson = {
            categories: [
                {
                    name: "settings"
                },
                {
                    name: "connect"
                },
                {
                    name: "about"
                }
            ]
        };

        this._CopyJson = {
            guideLine: "Visit the BlokDust companion guide for an in depth Wiki, tutorials, news & more:",
            guideURL: "BlokDust Guide",
            copyLine: "Spread the word about BlokDust:",
            connectLine: "Connect with BlokDust elsewhere:",
            generateLine: "Randomise Title",
            facebook: "share on facebook",
            twitter: "share on twitter",
            google: "share on google +",
            bookmark: "bookmark creation",
            tweetText: "Browser-based music making with @blokdust - "
        };

        this.Populate(this.MenuJson);

    }

    //-------------------------------------------------------------------------------------------
    //  POPULATE
    //-------------------------------------------------------------------------------------------

    Populate(json) {
        var units = App.Unit;
        var ctx = this.Ctx;
        var dataType = units*10;
        var gutter = 60;
        var menuCats = [];

        if (App.Metrics.Device !== Device.desktop) {
            gutter = 40;
        }

        // GET NUMBER OF CATEGORIES //
        var n = json.categories.length;

        // GET MENU & CATEGORY WIDTHS //
        ctx.font = "400 " + dataType + "px Dosis";
        ctx.textAlign = "left";
        var catWidth = [];
        var menuWidth = (this.DrawTo.Width/7)*4;

        // total text width //
        for (var i=0; i<n; i++) {
            catWidth[i] = ctx.measureText(json.categories[i].name.toUpperCase()).width + (gutter*units);
        }

        // start x for positioning //
        var catX = ((this.DrawTo.Width*0.5) - (menuWidth*0.5));


        // POPULATE MENU //
        for (var i=0; i<n; i++) {
            var name = json.categories[i].name.toUpperCase();
            var point = new Point(catX + (catWidth[i]*0.5),0);
            var size = new Size(catWidth[i],16);
            var offset = -this.DrawTo.Height;
            if (this._OpenTab===i) {
                offset = 0;
            }
            menuCats[i] = new MenuCategory(point,size,name,offset);
            catX += catWidth[i];
        }

        this.MenuItems = menuCats;
        this.MenuItems[this._OpenTab].Selected = 1;

        this.PopulateOptions();
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {

        var ctx = this.Ctx;
        var midType = App.Metrics.TxtMid;
        var headType = App.Metrics.TxtHeader;
        var largeType = App.Metrics.TxtLarge;
        var urlType = App.Metrics.TxtUrl2;
        var italicType2 = App.Metrics.TxtItalic2;
        var units = App.Unit;
        var grid = App.GridSize;
        var centerY = this.OffsetY + (App.Height * 0.5);
        var tabY = this.OffsetY;
        var menuWidth = (App.Width/7)*4;
        var halfWidth = menuWidth * 0.5;
        var dx = (App.Width*0.5);
        var leftX = dx - halfWidth;
        var pageY = tabY + (120*units);
        var tab;

        if (this.Open) {

            // BG //
            App.FillColor(ctx,App.Palette[2]);
            ctx.globalAlpha = 0.95;
            if (this.Open) {
                ctx.fillRect(0,this.OffsetY,App.Width,App.Height); // solid
            }
            ctx.globalAlpha = 1;


            // CLOSE BUTTON //
            var closeY = tabY + (30*units);
            ctx.lineWidth = 2;
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.beginPath();
            ctx.moveTo(dx + halfWidth + (12.5*units), closeY - (7.5*units));
            ctx.lineTo(dx + halfWidth + (27.5*units), closeY + (7.5*units));
            ctx.moveTo(dx + halfWidth + (27.5*units), closeY - (7.5*units));
            ctx.lineTo(dx + halfWidth + (12.5*units), closeY + (7.5*units));
            ctx.stroke();


            var gutter = (40*units);
            var thirdWidth = (menuWidth - (gutter*2))/3;
            var thirdY = pageY + (130 * units);
            var x1 = dx - halfWidth;
            var x2 = dx - halfWidth + thirdWidth + gutter;
            var x3 = dx - halfWidth + (thirdWidth*2) + (gutter*2);

            ctx.textAlign = "left";
            ctx.font = headType;
            ctx.fillText(this._Attribution.title.toUpperCase(),20*units,this.OffsetY + (30*units) + (11*units));



            // CLIPPING BOX //
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(dx - (App.Width*0.5),tabY + (60*units));
            ctx.lineTo(dx + (App.Width*0.5),tabY + (60*units));
            ctx.lineTo(dx + (App.Width*0.5),App.Height);
            ctx.lineTo(dx - (App.Width*0.5),App.Height);
            ctx.closePath();
            ctx.clip();



            // TAB 1 //
            tab = this.MenuItems[0].YOffset;

            this.Options[0].Draw(ctx,units,0,this,pageY + tab);
            this.Options[1].Draw(ctx,units,1,this,pageY + tab + (60*units));
            this.Options[2].Draw(ctx,units,2,this,pageY + tab + (108*units));
            this.Options[3].Draw(ctx,units,3,this,pageY + tab + (156*units));

            // TAB 2 //
            tab = this.MenuItems[1].YOffset;

            App.FillColor(ctx,App.Palette[4]);
            ctx.fillRect(dx - (210*units),pageY + tab + (10*units),420*units,40*units);

            ctx.font = urlType;
            ctx.textAlign = "center";
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.fillText(this._CopyJson.guideURL.toUpperCase(), dx, pageY + tab + (39*units));




            var buttonY = pageY + tab + (100*units);

            // SHARE BUTTONS //
            ctx.fillStyle = "#fc4742";// gp //TODO: Store these share colours somewhere
            ctx.fillRect(dx + (80*units),buttonY,130*units,30*units);
            if (this._RollOvers[8]) {
                ctx.beginPath();
                ctx.moveTo(dx + (145*units), buttonY + (39*units));
                ctx.lineTo(dx + (135*units), buttonY + (29*units));
                ctx.lineTo(dx + (155*units), buttonY + (29*units));
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = "#2db0e7"; // tw
            ctx.fillRect(dx - (65*units),buttonY,130*units,30*units);
            if (this._RollOvers[7]) {
                ctx.beginPath();
                ctx.moveTo(dx, buttonY + (39*units));
                ctx.lineTo(dx - (10*units), buttonY + (29*units));
                ctx.lineTo(dx + (10*units), buttonY + (29*units));
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = "#2152ad"; // fb
            ctx.fillRect(dx - (210*units),buttonY,130*units,30*units);
            if (this._RollOvers[6]) {
                ctx.beginPath();
                ctx.moveTo(dx - (145*units), buttonY + (39*units));
                ctx.lineTo(dx - (135*units), buttonY + (29*units));
                ctx.lineTo(dx - (155*units), buttonY + (29*units));
                ctx.closePath();
                ctx.fill();
            }

            // SHARE COPY //
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.textAlign = "left";
            ctx.font = italicType2;
            ctx.fillText(this._CopyJson.copyLine, dx - (210*units), buttonY - (10*units) );
            ctx.fillText(this._CopyJson.guideLine, dx - (210*units), pageY + tab );
            ctx.textAlign = "center";
            ctx.font = midType;
            ctx.fillText(this._CopyJson.facebook.toUpperCase(), dx - (145*units), buttonY + (18.5*units) );
            ctx.fillText(this._CopyJson.twitter.toUpperCase(), dx, buttonY + (18.5*units) );
            ctx.fillText(this._CopyJson.google.toUpperCase(), dx  + (145*units), buttonY + (18.5*units) );



            // TAB 3 //
            tab = this.MenuItems[2].YOffset;

            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.font = largeType;
            ctx.textAlign = "left";
            this.WordWrap(ctx, this._Attribution.about, dx - halfWidth, pageY + tab, units*16, Math.ceil(menuWidth));


            var xs = [x1,x2,x3];
            var widths = [];
            var strings = [
                this._Attribution.twyman.url,this._Attribution.phillips.url,this._Attribution.silverton.url,
                this._Attribution.twyman.twitter,this._Attribution.phillips.twitter,this._Attribution.silverton.twitter
            ];
            ctx.font = italicType2;
            for (var i=1; i<=(strings.length); i++) {
                widths.push(ctx.measureText(strings[i-1]).width);
            }


            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.lineWidth = 1;
            for (var i=1; i<4; i++) {
                if (this._RollOvers[i]) {
                    /*App.FillColor(ctx,App.Palette[3]);
                    ctx.beginPath();
                    ctx.moveTo(xs[i-1] - (5*units), thirdY + (43*units) - (grid*0.5) + tab);
                    ctx.lineTo(xs[i-1] - (5*units) - (grid*0.5),thirdY + (43*units) - (grid*0.5) + tab);
                    ctx.lineTo(xs[i-1] - (5*units),thirdY + (43*units) + tab);
                    ctx.closePath();
                    ctx.fill();*/

                    ctx.beginPath();
                    ctx.moveTo(xs[i-1], thirdY + (44*units) + tab);
                    ctx.lineTo(xs[i-1] + (widths[i-1]),thirdY + (44*units) + tab);
                    ctx.stroke();
                }
                if (this._RollOvers[i+3]) {
                    /*App.FillColor(ctx,App.Palette[3]);
                    ctx.beginPath();
                    ctx.moveTo(xs[i-1] - (5*units), thirdY + (57*units) - (grid*0.5) + tab);
                    ctx.lineTo(xs[i-1] - (5*units) - (grid*0.5),thirdY + (57*units) - (grid*0.5) + tab);
                    ctx.lineTo(xs[i-1] - (5*units),thirdY + (57*units) + tab);
                    ctx.closePath();
                    ctx.fill();*/

                    ctx.beginPath();
                    ctx.moveTo(xs[i-1], thirdY + (58*units) + tab);
                    ctx.lineTo(xs[i-1] + (widths[i+2]),thirdY + (58*units) + tab);
                    ctx.stroke();
                }
            }

            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);


            // BLURBS //
            this.WordWrap(ctx, this._Attribution.twyman.blurb, x1, thirdY + tab, units*14, Math.ceil(thirdWidth));
            this.WordWrap(ctx, this._Attribution.phillips.blurb, x2, thirdY + tab, units*14, Math.ceil(thirdWidth));
            this.WordWrap(ctx, this._Attribution.silverton.blurb, x3, thirdY + tab, units*14, Math.ceil(thirdWidth));

            // URLS //
            ctx.fillText(this._Attribution.twyman.url, x1, thirdY + (42 * units) + tab);
            ctx.fillText(this._Attribution.phillips.url, x2, thirdY + (42 * units) + tab);
            ctx.fillText(this._Attribution.silverton.url, x3, thirdY + (42 * units) + tab);

            // TWITTERS //
            ctx.fillText(this._Attribution.twyman.twitter, x1, thirdY + (56 * units) + tab);
            ctx.fillText(this._Attribution.phillips.twitter, x2, thirdY + (56 * units) + tab);
            ctx.fillText(this._Attribution.silverton.twitter, x3, thirdY + (56 * units) + tab);




            // BLOCKS //
            var blockY = thirdY - grid - (10*units) + tab;

            App.FillColor(ctx,App.Palette[4]);
            ctx.beginPath();
            ctx.moveTo(x1,blockY - (grid*3));
            ctx.lineTo(x1 + (grid),blockY - (grid*3));
            ctx.lineTo(x1 + (grid*2),blockY - (grid*2));
            ctx.lineTo(x1 + grid,blockY - grid);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x1 + (grid),blockY);
            ctx.lineTo(x1 + (grid*2),blockY - grid);
            ctx.lineTo(x1 + (grid*2),blockY);
            ctx.closePath();
            ctx.fill();

            App.FillColor(ctx,App.Palette[5]);
            ctx.beginPath();
            ctx.moveTo(x2,blockY);
            ctx.lineTo(x2,blockY - grid);
            ctx.lineTo(x2 + grid,blockY - (grid*2));
            ctx.lineTo(x2 + (grid*3),blockY - (grid*2));
            ctx.lineTo(x2 + grid,blockY);
            ctx.closePath();
            ctx.fill();

            App.FillColor(ctx,App.Palette[7]);
            ctx.beginPath();
            ctx.moveTo(x3,blockY);
            ctx.lineTo(x3 + grid,blockY - (grid*3));
            ctx.lineTo(x3 + (grid*2),blockY - (grid*3));
            ctx.lineTo(x3 + (grid*2),blockY - grid);
            ctx.lineTo(x3 + grid,blockY);
            ctx.closePath();
            ctx.fill();

            App.FillColor(ctx,App.Palette[3]);
            ctx.beginPath();
            ctx.moveTo(x1,blockY);
            ctx.lineTo(x1,blockY - (grid*3));
            ctx.lineTo(x1 + grid,blockY - (grid*2));
            ctx.lineTo(x1 + grid,blockY - grid);
            ctx.closePath();
            ctx.fill();

            App.FillColor(ctx,App.Palette[10]);
            ctx.beginPath();
            ctx.moveTo(x2,blockY);
            ctx.lineTo(x2,blockY - grid);
            ctx.lineTo(x2 + grid,blockY - (grid*2));
            ctx.lineTo(x2 + grid,blockY);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x2, blockY - (grid*3));
            ctx.lineTo(x2 + grid,blockY - (grid*3));
            ctx.lineTo(x2,blockY - (grid*2));
            ctx.closePath();
            ctx.fill();

            App.FillColor(ctx,App.Palette[9]);
            ctx.beginPath();
            ctx.moveTo(x3,blockY);
            ctx.lineTo(x3,blockY - (grid*2));
            ctx.lineTo(x3 + grid,blockY - (grid*3));
            ctx.lineTo(x3 + grid,blockY - grid);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x3 + (grid*2), blockY);
            ctx.lineTo(x3 + (grid*3),blockY);
            ctx.lineTo(x3 + (grid*3),blockY - grid);
            ctx.closePath();
            ctx.fill();


            // END TAB 3 //
            ctx.restore();
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.font = italicType2;
            ctx.textAlign = "right";
            ctx.fillText(this._Attribution.build, this.DrawTo.Width - (20*units), this.OffsetY + this.DrawTo.Height - (20 * units));


            // DIVIDERS //
            ctx.lineWidth = 2;
            App.StrokeColor(ctx,App.Palette[1]);

            // Horizontal //
            ctx.beginPath();
            ctx.moveTo(dx - halfWidth,tabY + (60*units)-1);
            ctx.lineTo(dx + halfWidth,tabY + (60*units)-1);

            //vertical //
            for (var i=0;i<this.MenuItems.length;i++) {
                var cat = this.MenuItems[i];
                var menuX = cat.Position.x;
                if (i > 0) {
                    ctx.moveTo(Math.round(menuX - (cat.Size.width*0.5)), tabY + (16*units));
                    ctx.lineTo(Math.round(menuX - (cat.Size.width*0.5)), tabY + (44*units));
                }
            }
            ctx.stroke();



            // CATEGORIES //
            ctx.textAlign = "center";
            ctx.font = midType;

            for (var i=0;i<this.MenuItems.length;i++) {
                ctx.globalAlpha = 1;
                var cat = this.MenuItems[i];

                // SELECTION COLOUR //
                var col = this._MenuCols[i - (Math.floor(i / this._MenuCols.length) * (this._MenuCols.length))];
                App.FillColor(ctx,App.Palette[col]);

                // DRAW CAT HEADER //
                cat.Draw(ctx, units, this,tabY);
            }
        }
    }

    WordWrap( context , text, x, y, lineHeight, fitWidth) {
        fitWidth = fitWidth || 0;

        if (fitWidth <= 0)
        {
            context.fillText( text, x, y );
            return;
        }
        var words = text.split(' ');
        var currentLine = 0;
        var idx = 1;
        while (words.length > 0 && idx <= words.length)
        {
            var str = words.slice(0,idx).join(' ');
            var w = context.measureText(str).width;
            if ( w > fitWidth )
            {
                if (idx==1)
                {
                    idx=2;
                }
                context.fillText( words.slice(0,idx-1).join(' '), x, y + (lineHeight*currentLine) );
                currentLine++;
                words = words.splice(idx-1);
                idx = 1;
            }
            else
            {idx++;}
        }
        if  (idx > 0)
            context.fillText( words.join(' '), x, y + (lineHeight*currentLine) );
    }

    NumberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v){

        var offsetTween = new window.TWEEN.Tween({x: panel[""+v]});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;
        });

        offsetTween.onComplete(function() {
            if (v === "OffsetY") {
                if (destination!==0) {
                    panel.Open = false;
                }
            }
        });

        offsetTween.easing(window.TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.LastVisualTick);
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    OpenPanel() {
        this.Open = true;
        this.OffsetY = -this.DrawTo.Height;
        this.DelayTo(this,0,500,0,"OffsetY");
        this.MenuItems[this._OpenTab].YOffset = 0;
        //this.Populate();
    }

    ClosePanel() {
        this.DelayTo(this,-this.DrawTo.Height,500,0,"OffsetY");
    }

    PopulateOptions() {
        var optionList = [];
        var optionY = [];
        var optionNames = ["Color Theme","Master Volume","DB Meter","Tour"];

        var units = App.Unit;
        var centerY = this.OffsetY + (this.DrawTo.Height * 0.5);
        var tabY = this.OffsetY;
        var pageY = tabY + (120*units);
        var dx = (this.DrawTo.Width*0.5);
        var menuWidth = (this.DrawTo.Width/7)*4;
        var halfWidth = menuWidth*0.5;

        // MARGIN WIDTH //
        var mw = 0;
        this.Ctx.font = App.Metrics.TxtMid;
        for (var i=0;i<optionNames.length;i++) {
            var nw = this.Ctx.measureText(optionNames[i].toUpperCase()).width;
            if (nw > mw) {
                mw = nw;
            }
        }
        var marginWidth = mw + (15*units);

        this.Margin = dx - halfWidth + marginWidth;
        this.Range = menuWidth - marginWidth;
        this.SliderColours = [App.Palette[5],App.Palette[3],App.Palette[4],App.Palette[9],App.Palette[7]];


        // COLOR THEME //
        optionList.push(new ThemeSelector(optionNames[0]));

        // VOLUME //
        var sliderValue = App.Audio.Master.volume.value + 70;
        var sliderSetting = "volume";
        var sliderX = this.linPosition(0, this.Range, 0, 60, sliderValue);
        var sliderO = this.Margin;
        optionList.push(new Slider(new Point(sliderX,pageY + this.MenuItems[1].YOffset + (60*units)),new Size(1,48*App.Unit),sliderO,sliderValue,0,60,true,optionNames[1],sliderSetting,false));

        // METER //
        optionList.push(new OptionMeter(optionNames[2]));

        // TUTORIAL //
        optionList.push(new OptionActionButton(new Point(0,pageY + this.MenuItems[1].YOffset + (156*units)),new Size(1,48*App.Unit),optionNames[3],"Launch Tutorial","tutorial"));



        this.Options = optionList;
    }

    MouseDown(point) {
        this.HitTests(point);
        if (this._RollOvers[0]) {
            this.ClosePanel();
            return;
        }

        // OPTIONS //
        for (var i=0;i<this.Options.length;i++) {

            if (this._OptionsRoll[i]) {
                this.Options[i].Selected = true;

                if (this.Options[i].Type=="themeSelector") {
                    var option = this.Options[i];
                    if (option.HandleRoll[0]) {
                        App.ThemeManager.CurrentThemeNo -= 1;
                        if (App.ThemeManager.CurrentThemeNo < 0) {
                            App.ThemeManager.CurrentThemeNo = App.ThemeManager.Themes.length-1;
                        }
                        App.ThemeManager.LoadTheme(App.ThemeManager.CurrentThemeNo,false);
                    }
                    if (option.HandleRoll[1]) {
                        App.ThemeManager.CurrentThemeNo += 1;
                        if (App.ThemeManager.CurrentThemeNo > (App.ThemeManager.Themes.length-1)) {
                            App.ThemeManager.CurrentThemeNo = 0;
                        }
                        App.ThemeManager.LoadTheme(App.ThemeManager.CurrentThemeNo,false);
                    }
                }

                if (this.Options[i].Type=="slider") {
                    this.SliderSet(i, point.x);
                }

                if (this.Options[i].Type=="meter") {
                    this.Options[i].MonitorReset();
                }
                if (this.Options[i].Type == "actionbutton") {
                    if (this.Options[i].HandleRoll[0]) {
                        this.ActionButton(this.Options[i].Setting);
                    }
                }

            }
        }

        // SELECT CATEGORY //
        for (var i=0; i<this.MenuItems.length; i++) {
            if (this.MenuItems[i].Hover) {
                window.TWEEN.removeAll(); // TODO - swap for local tween pool
                var cat = this.MenuItems[i];

                this.DelayTo(cat,1,400,0,"Selected");
                this.DelayTo(cat,0,400,400,"YOffset");

                this._OpenTab = i; // I'M THE SELECTED CATEGORY

                // RESET NON-SELECTED CATEGORIES //
                for (var j=0; j<this.MenuItems.length; j++) {
                    if (j!==i) {
                        var cat = this.MenuItems[j];
                        this.DelayTo(cat,0,250,0,"Selected");
                        this.DelayTo(cat,-this.DrawTo.Height,250,0,"YOffset");
                    }
                }
                return;
            }
        }




        // EXTERNAL URLS //
        var urls = [this._Attribution.twyman.url,this._Attribution.phillips.url,this._Attribution.silverton.url,this._Attribution.twyman.twitter,this._Attribution.phillips.twitter,this._Attribution.silverton.twitter];
        for (var i=1; i<7; i++) {
           if (this._RollOvers[i]) {
               if (i>3) {
                   window.open("http://twitter.com/"+urls[i-1],"_blank");
               } else {
                   window.open("http://"+urls[i-1],"_blank");
               }
           }
        }
    }

    MouseMove(point) {
        this.HitTests(point);

        for (var i=0;i<this.Options.length;i++) {
            if (this.Options[i].Selected) {
                if (this.Options[i].Type=="slider") {
                    this.SliderSet(i, point.x);
                }
            }
        }

    }

    HitTests(point) {
        var units = App.Unit;
        var centerY = this.OffsetY + (this.DrawTo.Height * 0.5);
        var tabY = this.OffsetY;
        var pageY = tabY + (120*units);
        var closeY = tabY + (30*units);
        var dx = (this.DrawTo.Width*0.5);
        var menuWidth = (this.DrawTo.Width/7)*4;
        var halfWidth = menuWidth*0.5;
        var gutter = (40*units);
        var thirdWidth = (menuWidth - (gutter*2))/3;
        var thirdY = pageY + (130 * units);
        var x1 = dx - halfWidth;
        var x2 = dx - halfWidth + thirdWidth + gutter;
        var x3 = dx - halfWidth + (thirdWidth*2) + (gutter*2);
        var xs = [x1,x2,x3];
        var tab;

        this._RollOvers[0] = Dimensions.HitRect(dx + halfWidth, closeY - (20*units),40*units,40*units, point.x, point.y); // close

        for (var i=1; i<4; i++) {
            this._RollOvers[i] = Dimensions.HitRect(xs[i-1], thirdY + (25*units) + this.MenuItems[2].YOffset,thirdWidth,20*units, point.x, point.y); // url
            this._RollOvers[i+3] = Dimensions.HitRect(xs[i-1], thirdY + (45*units) + this.MenuItems[2].YOffset,thirdWidth,20*units, point.x, point.y); // twitter
        }

        // CATEGORY HIT TEST //
        for (var i=0; i<this.MenuItems.length; i++) {
            var cat = this.MenuItems[i];
            cat.Hover = Dimensions.HitRect(cat.Position.x - (cat.Size.width*0.5) + (2*units), tabY + (5*units), cat.Size.width - (4*units), (this.Height*units) - (10*units), point.x, point.y );
        }

        // OPTIONS HIT TESTS //
        tab = this.MenuItems[0].YOffset;
        for (var i=0;i<this.Options.length;i++) {
            if (this.Options[i].Type == "slider") {
                this._OptionsRoll[i] = Dimensions.HitRect(this.Margin - (10*units), pageY + tab + (60*units), this.Range + (20*units), 48*App.Unit, point.x, point.y);
            }
            if (this.Options[i].Type == "meter") {
                this._OptionsRoll[i] = Dimensions.HitRect(this.Margin - (10*units), pageY + tab + (108*units), this.Range + (20*units), 48*App.Unit, point.x, point.y);
            }
            if (this.Options[i].Type == "themeSelector") {
                this._OptionsRoll[i] = Dimensions.HitRect(this.Margin - (10*units), pageY + tab, this.Range + (20*units), 60*App.Unit, point.x, point.y);
                this.Options[i].HandleRoll[0] = Dimensions.HitRect(this.Margin - (10*units), pageY + tab, 40*units, 60*units, point.x, point.y);
                this.Options[i].HandleRoll[1] = Dimensions.HitRect(this.Margin + this.Range - (30*units), pageY + tab, 40*units, 60*units, point.x, point.y);
            }
            if (this.Options[i].Type == "actionbutton") {
                this._OptionsRoll[i] = Dimensions.HitRect(this.Margin - (10*units), pageY + tab + (156*units), this.Range + (20*units), 48*App.Unit, point.x, point.y);
                this.Options[i].HandleRoll[0] = Dimensions.HitRect(this.Margin + (this.Range * 0.25), pageY + tab + (156*units), (this.Range * 0.5), this.Options[i].Size.height, point.x, point.y);
            }
        }
    }

    MouseUp(point) {
        for (var i=0;i<this.Options.length;i++) {
            this.Options[i].Selected = false;
        }
    }

    // DRAGGING A SLIDER //
    SliderSet(n,mx) {
        var units = App.Unit;
        var centerY = this.OffsetY + (this.DrawTo.Height * 0.5);
        var tabY = this.OffsetY;
        var pageY = tabY + (120*units);
        var dx = (this.DrawTo.Width*0.5);
        var menuWidth = (this.DrawTo.Width/7)*4;
        var halfWidth = menuWidth*0.5;

        this.Options[n].Position.x = mx - this.Margin;
        this.Options[n].Position.x = this.ValueInRange(this.Options[n].Position.x,0,this.Range);
        var log = false;
        this.UpdateValue(this.Options[n],"Value","Min","Max",0, this.Range,"Setting","x",log);
    }

    ActionButton(setting) {
        switch (setting) {
            case "tutorial" :
                console.log("tutorial manually launched");
                break;
        }
    }

    // UPDATE THE VALUE IN THE BLOCK //
    UpdateValue(object,value,min,max,rangemin,rangemax,setting,axis,log) {

        // CALCULATE VALUE //
        object[""+value] = this.linValue(rangemin,rangemax,object[""+min],object[""+max],object.Position[""+axis]);


        // QUANTIZE //
        if (object.Quantised) {
            object[""+value] = Math.round(object[""+value]);
            object.Position["" + axis] = this.linPosition(rangemin, rangemax, object["" + min], object["" + max], object["" + value]);
        }

        // SET VALUE //
        var val = object[""+value];
        console.log("" + object[""+setting] +" | "+ val);
        switch (object[""+setting]) {
            case "volume":
                App.Audio.Master.volume.value = val - 70;
                if (val===0) {
                    App.Audio.Master.volume.value = val - 200;
                }
                break;
        }
    }



    //-------------------------------------------------------------------------------------------
    //  MATHS
    //-------------------------------------------------------------------------------------------

    ValueInRange(value,floor,ceiling) {
        if (value < floor) {
            value = floor;
        }
        if (value> ceiling) {
            value = ceiling;
        }
        return value;
    }

    linValue(minpos,maxpos,minval,maxval,position) {
        var scale = (maxval - minval) / (maxpos - minpos);
        //console.log("" +minval + " | " +maxval + " | " +position);
        return (position - minpos) * scale + minval;
    }

    linPosition(minpos,maxpos,minval,maxval,value) {
        var scale = (maxval - minval) / (maxpos - minpos);
        //console.log("" +minval + " | " +maxval + " | " +value);
        return minpos + (value - minval) / scale;
    }


    Resize() {
    }

}
