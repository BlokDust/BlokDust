import Size = minerva.Size;
import {Device} from '../Device';
import {DisplayObject} from '../Core/Drawing/DisplayObject';
import {IApp} from '../IApp';
import {IDisplayContext} from '../Core/Drawing/IDisplayContext';
import {MainScene} from './../MainScene';
import {MenuCategory} from './MenuCategory';
import {Point} from '../Core/Primitives/Point';
import {ThemeSelector} from './ColorThemeSelector';
import {Version} from './../_Version';

declare var App: IApp;

export class SettingsPanel extends DisplayObject{

    public Open: boolean;
    public OffsetY: number;
    //public TabOffset: number[];
    private _RollOvers: boolean[];
    private _CopyJson: any;
    public MenuItems: MenuCategory[] = [];
    private _MenuCols: number[];
    public MenuJson: any;
    public Height: number;
    private _OpenTab: number;
    private _VersionNumber: string;
    private _ThemeSelector: ThemeSelector;

    Init(sketch: IDisplayContext): void {
        super.Init(sketch);

        this.Open = false;
        this.OffsetY = -this.Sketch.Height;

        this._RollOvers = [];
        this.Height = 60;
        this.MenuItems = [];
        this._MenuCols = [9,5,7,4,3];
        this._OpenTab = 2;
        this._VersionNumber = Version;
        console.log(Version);

        // OPTIONS //
        this._ThemeSelector = new ThemeSelector;


        this._CopyJson = {
            title: "General",
            about: "BlokDust is a collaboration between Luke Twyman, Luke Phillips and Edward Silverton. Developed in Brighton UK and released in 2015, BlokDust uses the Web Audio API and makes use of Tone.js as an audio framework. The project is open source, and we hope to see a community of contributors emerge though GitHub & SoundCloud.",

            twyman: {
                blurb: "Luke Twyman - project concept, design & UI.",
                url: "whitevinyldesign.com",
                twitter: "@whitevinylUK"
            },

            phillips: {
                blurb: "Luke Phillips - audio development & musical interaction.",
                url: "femurdesign.com",
                twitter: "@lukephills"
            },

            silverton: {
                blurb: "Edward Silverton - client & server core development & architecture.",
                url: "edsilv.com",
                twitter: "@edsilv"
            },

            thanks: "Thanks also to Yotam Mann and Brad Sickles.",
            build: "Current Build: " + this._VersionNumber
        };

        this.MenuJson = {
            categories: [
                {
                    name: "connect"
                },
                {
                    name: "settings"
                },
                {
                    name: "about"
                }
            ]
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
        var menuWidth = (this.Sketch.Width/7)*4;

        // total text width //
        for (var i=0; i<n; i++) {
            catWidth[i] = ctx.measureText(json.categories[i].name.toUpperCase()).width + (gutter*units);
        }

        // start x for positioning //
        var catX = ((this.Sketch.Width*0.5) - (menuWidth*0.5));


        // POPULATE MENU //
        for (var i=0; i<n; i++) {
            var name = json.categories[i].name.toUpperCase();
            var point = new Point(catX + (catWidth[i]*0.5),0);
            var size = new Size(catWidth[i],16);
            var offset = -this.Sketch.Height;
            if (this._OpenTab===i) {
                offset = 0;
            }
            menuCats[i] = new MenuCategory(point,size,name,offset);
            catX += catWidth[i];
        }

        this.MenuItems = menuCats;
        this.MenuItems[this._OpenTab].Selected = 1;
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {

        var ctx = this.Ctx;
        var midType = App.Metrics.TxtMid;
        var headType = App.Metrics.TxtHeader;
        var largeType = App.Metrics.TxtLarge;
        var italicType2 = App.Metrics.TxtItalic2;
        var units = App.Unit;
        var grid = App.GridSize;
        var centerY = this.OffsetY + (App.Height * 0.5);
        var tabY = this.OffsetY;
        var menuWidth = (App.Width/7)*4;
        var halfWidth = menuWidth * 0.5;
        var dx = (App.Width*0.5);
        var pageY = tabY + (120*units);


        if (this.Open) {

            // BG //
            ctx.fillStyle = App.Palette[2];// Black
            ctx.globalAlpha = 0.95;
            if (this.Open) {
                ctx.fillRect(0,this.OffsetY,App.Width,App.Height); // solid
            }
            ctx.globalAlpha = 1;


            // CLOSE BUTTON //
            var closeY = tabY + (30*units);
            ctx.lineWidth = 2;
            ctx.fillStyle = ctx.strokeStyle = App.Palette[App.Color.Txt]; // White
            ctx.beginPath();
            ctx.moveTo(dx + halfWidth + (12.5*units), closeY - (7.5*units));
            ctx.lineTo(dx + halfWidth + (27.5*units), closeY + (7.5*units));
            ctx.moveTo(dx + halfWidth + (27.5*units), closeY - (7.5*units));
            ctx.lineTo(dx + halfWidth + (12.5*units), closeY + (7.5*units));
            ctx.stroke();


            var gutter = (40*units);
            var thirdWidth = (menuWidth - (gutter*2))/3;
            var thirdY = pageY + (170 * units);
            var x1 = dx - halfWidth;
            var x2 = dx - halfWidth + thirdWidth + gutter;
            var x3 = dx - halfWidth + (thirdWidth*2) + (gutter*2);

            ctx.textAlign = "left";
            ctx.font = headType;
            ctx.fillText(this._CopyJson.title.toUpperCase(),20*units,this.OffsetY + (30*units) + (11*units));



            // CLIPPING BOX //
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(dx - (App.Width*0.5),tabY + (60*units));
            ctx.lineTo(dx + (App.Width*0.5),tabY + (60*units));
            ctx.lineTo(dx + (App.Width*0.5),App.Height);
            ctx.lineTo(dx - (App.Width*0.5),App.Height);
            ctx.closePath();
            ctx.clip();


            // TAB 2 //
            var tab = this.MenuItems[1].YOffset;

            this._ThemeSelector.Draw(ctx, dx - halfWidth, pageY + tab, menuWidth, 60*units, units);


            // TAB 3 //
            var tab = this.MenuItems[2].YOffset;

            ctx.fillStyle = ctx.strokeStyle = App.Palette[App.Color.Txt]; // White
            ctx.font = largeType;
            ctx.textAlign = "left";
            this.WordWrap(ctx, this._CopyJson.about, dx - halfWidth, pageY + tab, units*16, Math.ceil(menuWidth));


            var xs = [x1,x2,x3];
            for (var i=1; i<4; i++) {
                if (this._RollOvers[i]) {
                    ctx.fillStyle = App.Palette[3];// Blue
                    ctx.beginPath();
                    ctx.moveTo(xs[i-1] - (5*units), thirdY + (43*units) - (grid*0.5) + tab);
                    ctx.lineTo(xs[i-1] - (5*units) - (grid*0.5),thirdY + (43*units) - (grid*0.5) + tab);
                    ctx.lineTo(xs[i-1] - (5*units),thirdY + (43*units) + tab);
                    ctx.closePath();
                    ctx.fill();
                }
                if (this._RollOvers[i+3]) {
                    ctx.fillStyle = App.Palette[3];// Blue
                    ctx.beginPath();
                    ctx.moveTo(xs[i-1] - (5*units), thirdY + (57*units) - (grid*0.5) + tab);
                    ctx.lineTo(xs[i-1] - (5*units) - (grid*0.5),thirdY + (57*units) - (grid*0.5) + tab);
                    ctx.lineTo(xs[i-1] - (5*units),thirdY + (57*units) + tab);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            ctx.fillStyle = ctx.strokeStyle = App.Palette[App.Color.Txt]; // White
            ctx.font = italicType2;

            // BLURBS //
            this.WordWrap(ctx, this._CopyJson.twyman.blurb, x1, thirdY + tab, units*14, Math.ceil(thirdWidth));
            this.WordWrap(ctx, this._CopyJson.phillips.blurb, x2, thirdY + tab, units*14, Math.ceil(thirdWidth));
            this.WordWrap(ctx, this._CopyJson.silverton.blurb, x3, thirdY + tab, units*14, Math.ceil(thirdWidth));

            // URLS //
            ctx.fillText(this._CopyJson.twyman.url, x1, thirdY + (42 * units) + tab);
            ctx.fillText(this._CopyJson.phillips.url, x2, thirdY + (42 * units) + tab);
            ctx.fillText(this._CopyJson.silverton.url, x3, thirdY + (42 * units) + tab);

            // TWITTERS //
            ctx.fillText(this._CopyJson.twyman.twitter, x1, thirdY + (56 * units) + tab);
            ctx.fillText(this._CopyJson.phillips.twitter, x2, thirdY + (56 * units) + tab);
            ctx.fillText(this._CopyJson.silverton.twitter, x3, thirdY + (56 * units) + tab);




            // BLOCKS //
            var blockY = thirdY - grid - (10*units) + tab;

            ctx.fillStyle = App.Palette[4];// red
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

            ctx.fillStyle = App.Palette[5];// Black
            ctx.beginPath();
            ctx.moveTo(x2,blockY);
            ctx.lineTo(x2,blockY - grid);
            ctx.lineTo(x2 + grid,blockY - (grid*2));
            ctx.lineTo(x2 + (grid*3),blockY - (grid*2));
            ctx.lineTo(x2 + grid,blockY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = App.Palette[7];// Black
            ctx.beginPath();
            ctx.moveTo(x3,blockY);
            ctx.lineTo(x3 + grid,blockY - (grid*3));
            ctx.lineTo(x3 + (grid*2),blockY - (grid*3));
            ctx.lineTo(x3 + (grid*2),blockY - grid);
            ctx.lineTo(x3 + grid,blockY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = App.Palette[3];// Blue
            ctx.beginPath();
            ctx.moveTo(x1,blockY);
            ctx.lineTo(x1,blockY - (grid*3));
            ctx.lineTo(x1 + grid,blockY - (grid*2));
            ctx.lineTo(x1 + grid,blockY - grid);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = App.Palette[10];// Yellow
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

            ctx.fillStyle = App.Palette[9];// Red
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
            ctx.fillStyle = ctx.strokeStyle = App.Palette[App.Color.Txt]; // White
            ctx.font = italicType2;
            ctx.textAlign = "right";
            ctx.fillText(this._CopyJson.build, this.Sketch.Width - (20*units), this.OffsetY + this.Sketch.Height - (20 * units));


            // DIVIDERS //
            ctx.lineWidth = 2;
            ctx.strokeStyle = App.Palette[1];// White

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
                ctx.fillStyle = App.Palette[col];

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

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v){

        var offsetTween = new TWEEN.Tween({x: panel[""+v]});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;
        });

        offsetTween.onComplete(function() {
            if (v=="OffsetY") {
                if (destination!==0) {
                    panel.Open = false;
                }
            }
        });
        offsetTween.easing(TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.LastVisualTick);
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    OpenPanel() {
        this.Open = true;
        this.OffsetY = -this.Sketch.Height;
        this.DelayTo(this,0,500,0,"OffsetY");
        this.MenuItems[this._OpenTab].YOffset = 0;
    }

    ClosePanel() {
        this.DelayTo(this,-this.Sketch.Height,500,0,"OffsetY");
    }

    MouseDown(point) {
        this.HitTests(point);
        if (this._RollOvers[0]) {
            this.ClosePanel();
            return;
        }

        // SELECT CATEGORY //
        for (var i=0; i<this.MenuItems.length; i++) {
            if (this.MenuItems[i].Hover) {
                TWEEN.removeAll(); // TODO - swap for local tween pool
                var cat = this.MenuItems[i];

                this.DelayTo(cat,1,400,0,"Selected");
                this.DelayTo(cat,0,400,400,"YOffset");

                this._OpenTab = i; // I'M THE SELECTED CATEGORY

                // RESET NON-SELECTED CATEGORIES //
                for (var j=0; j<this.MenuItems.length; j++) {
                    if (j!==i) {
                        var cat = this.MenuItems[j];
                        this.DelayTo(cat,0,250,0,"Selected");
                        this.DelayTo(cat,-this.Sketch.Height,250,0,"YOffset");
                    }
                }
                return;
            }
        }


        // OPTIONS //
        if (this._ThemeSelector.HandleRoll[0]) {
            App.Color.CurrentThemeNo -= 1;
            if (App.Color.CurrentThemeNo < 0) {
                App.Color.CurrentThemeNo = App.Color.Themes.length-1;
            }
            App.Color.LoadTheme(App.Color.CurrentThemeNo,false);
        }
        if (this._ThemeSelector.HandleRoll[1]) {
            App.Color.CurrentThemeNo += 1;
            if (App.Color.CurrentThemeNo > (App.Color.Themes.length-1)) {
                App.Color.CurrentThemeNo = 0;
            }
            App.Color.LoadTheme(App.Color.CurrentThemeNo,false);
        }



        // EXTERNAL URLS //
        var urls = [this._CopyJson.twyman.url,this._CopyJson.phillips.url,this._CopyJson.silverton.url,this._CopyJson.twyman.twitter,this._CopyJson.phillips.twitter,this._CopyJson.silverton.twitter];
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
    }

    HitTests(point) {
        var units = App.Unit;
        var centerY = this.OffsetY + (this.Sketch.Height * 0.5);
        var tabY = this.OffsetY;
        var pageY = tabY + (120*units);
        var closeY = tabY + (30*units);
        var dx = (this.Sketch.Width*0.5);
        var menuWidth = (this.Sketch.Width/7)*4;
        var halfWidth = menuWidth*0.5;
        var gutter = (40*units);
        var thirdWidth = (menuWidth - (gutter*2))/3;
        var thirdY = pageY + (170 * units);
        var x1 = dx - halfWidth;
        var x2 = dx - halfWidth + thirdWidth + gutter;
        var x3 = dx - halfWidth + (thirdWidth*2) + (gutter*2);
        var xs = [x1,x2,x3];

        this._RollOvers[0] = this.HitRect(dx + halfWidth, closeY - (20*units),40*units,40*units, point.x, point.y); // close

        for (var i=1; i<4; i++) {
            this._RollOvers[i] = this.HitRect(xs[i-1], thirdY + (30*units) + this.MenuItems[2].YOffset,thirdWidth,20*units, point.x, point.y); // url
            this._RollOvers[i+3] = this.HitRect(xs[i-1], thirdY + (50*units) + this.MenuItems[2].YOffset,thirdWidth,20*units, point.x, point.y); // twitter
        }


        // CATEGORY HIT TEST //
        for (var i=0; i<this.MenuItems.length; i++) {
            var cat = this.MenuItems[i];
            cat.Hover = this.HitRect(cat.Position.x - (cat.Size.width*0.5) + (2*units), tabY + (5*units), cat.Size.width - (4*units), (this.Height*units) - (10*units), point.x, point.y );
        }

        // OPTIONS HIT TESTS //
        var selector = this._ThemeSelector;
        selector.HandleRoll[0] = this.HitRect(dx - halfWidth - (10*units), pageY + this.MenuItems[1].YOffset, 40*units, 60*units, point.x, point.y);
        selector.HandleRoll[1] = this.HitRect(dx + halfWidth - (30*units), pageY + this.MenuItems[1].YOffset, 40*units, 60*units, point.x, point.y);
    }

    MouseUp(point) {
    }

}
