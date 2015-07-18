/**
 * Created by luketwyman on 13/06/2015.
 */
import Version = require("./../_Version");
import Size = minerva.Size;
import Grid = require("./../Grid");
import DisplayObject = require("../DisplayObject");
import BlocksSketch = require("./../BlocksSketch");
import MenuCategory = require("./MenuCategory");

class SettingsPanel extends DisplayObject{

    public Open: boolean;
    public OffsetY: number;
    private _RollOvers: boolean[];
    private _CopyJson: any;
    public MenuItems: MenuCategory[] = [];
    private _MenuCols: number[];
    public MenuJson: any;
    public Height: number;
    private _OpenTab: number;
    private _VersionNumber: string;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Open = false;
        this.OffsetY = -this.Sketch.Height;
        this._RollOvers = [];
        this.Height = 60;
        this.MenuItems = [];
        this._MenuCols = [9,5,7,4,3];
        this._OpenTab = 2;
        this._VersionNumber = Version.Version;

        /*this._CopyJson = {
            credits: "BlokDust is a collaboration between Luke Twyman, Luke Phillips and Edward Silverton.",
            creditsFull: "Luke T is responsible for concept, design & UI, Luke P is responsible for audio development & interaction, and Edward is responsible for core development, project structure & server stuff.",
            thanks: "Thanks also to Yotam Mann and Brad Sickles."
        };*/

        this._CopyJson = {
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
                blurb: "Edward Silverton - project architecture & server stuff.",
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
                    name: "general"
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
        var units = (<Grid>this.Sketch).Unit.width;
        var ctx = this.Ctx;
        var dataType = units*10;
        var gutter = 60;
        var menuCats = [];



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
            menuCats[i] = new MenuCategory(point,size,name,0);
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
        var midType = (<BlocksSketch>this.Sketch).TxtMid;
        var headType = (<BlocksSketch>this.Sketch).TxtHeader;
        var largeType = (<BlocksSketch>this.Sketch).TxtLarge;
        var italicType2 = (<BlocksSketch>this.Sketch).TxtItalic2;
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        var centerY = this.OffsetY + (this.Sketch.Height * 0.5);
        var tabY = centerY - (180*units);
        tabY = this.OffsetY;
        var menuWidth = (this.Sketch.Width/7)*4;
        var halfWidth = menuWidth * 0.5;
        var dx = (this.Sketch.Width*0.5);
        var grid = (<BlocksSketch>this.Sketch).GridSize*units;
        var pageY = tabY + (120*units);


        if (this.Open) {

            // BG //
            ctx.fillStyle = App.Palette[2];// Black
            ctx.globalAlpha = 0.95;
            if (this.Open) {
                ctx.fillRect(0,this.OffsetY,this.Sketch.Width,this.Sketch.Height); // solid
            }
            ctx.globalAlpha = 1;

            // CLOSE BUTTON //
            var closeY = tabY + (30*units);
            ctx.lineWidth = 2;
            ctx.fillStyle = ctx.strokeStyle = App.Palette[8]; // White
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
            ctx.fillText("SETTINGS",20*units,this.OffsetY + (30*units) + (11*units));

            ctx.font = largeType;
            this.WordWrap(ctx, this._CopyJson.about, dx - halfWidth, pageY, units*16, Math.ceil(menuWidth));
            //this.WordWrap(ctx, this._CopyJson.thanks, dx - halfWidth, centerY + (164 * units), units*16, menuWidth);


            ctx.font = italicType2;
            this.WordWrap(ctx, this._CopyJson.twyman.blurb, x1, thirdY, units*14, Math.ceil(thirdWidth));
            this.WordWrap(ctx, this._CopyJson.phillips.blurb, x2, thirdY, units*14, Math.ceil(thirdWidth));
            this.WordWrap(ctx, this._CopyJson.silverton.blurb, x3, thirdY, units*14, Math.ceil(thirdWidth));




            //ctx.fillStyle = ctx.strokeStyle = App.Palette[this._MenuCols[this._OpenTab]]; // Tab color
            ctx.fillText(this._CopyJson.twyman.url, x1, thirdY + (42 * units));
            ctx.fillText(this._CopyJson.phillips.url, x2, thirdY + (42 * units));
            ctx.fillText(this._CopyJson.silverton.url, x3, thirdY + (42 * units));

            ctx.fillText(this._CopyJson.twyman.twitter, x1, thirdY + (56 * units));
            ctx.fillText(this._CopyJson.phillips.twitter, x2, thirdY + (56 * units));
            ctx.fillText(this._CopyJson.silverton.twitter, x3, thirdY + (56 * units));

            //ctx.fillText(this._CopyJson.build, dx - halfWidth, centerY + (180 * units));
            ctx.textAlign = "right";
            ctx.fillText(this._CopyJson.build, this.Sketch.Width - (20*units), this.OffsetY + this.Sketch.Height - (20 * units));


            // BLOCKS //
            var blockY = thirdY - grid - (10*units);
            /*ctx.lineWidth = 1;
            ctx.strokeStyle = App.Palette[15];// White

            // Horizontal //
            ctx.beginPath();
            ctx.moveTo(x1 + grid,blockY - (grid));
            ctx.lineTo(x3 + grid,blockY - (grid));
            ctx.stroke();*/


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

            /*ctx.moveTo(Math.round(dx - halfWidth + thirdWidth + (gutter*0.5)), thirdY - (14*units));
            ctx.lineTo(Math.round(dx - halfWidth + thirdWidth + (gutter*0.5)), thirdY + (60*units));
            ctx.moveTo(Math.round(dx - halfWidth + (thirdWidth*2) + (gutter*1.5)), thirdY - (14*units));
            ctx.lineTo(Math.round(dx - halfWidth + (thirdWidth*2) + (gutter*1.5)), thirdY + (60*units));*/

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
            console.log("SETTINGS");
            console.log(panel.Open);
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
    }

    ClosePanel() {
        this.DelayTo(this,-this.Sketch.Height,500,0,"OffsetY");
    }

    MouseDown(point) {
        //this.HitTests(point);
        if (this._RollOvers[0]) {
            this.ClosePanel();
            return;
        }

        // SELECT CATEGORY //
        for (var i=0; i<this.MenuItems.length; i++) {
            if (this.MenuItems[i].Hover) {
                TWEEN.removeAll();
                var cat = this.MenuItems[i];

                this.DelayTo(cat,1,400,0,"Selected");
                this._OpenTab = i; // I'M THE SELECTED CATEGORY

                // RESET NON-SELECTED CATEGORIES //
                for (var j=0; j<this.MenuItems.length; j++) {
                    if (j!==i) {
                        var cat = this.MenuItems[j];
                        this.DelayTo(cat,0,250,0,"Selected");
                    }
                }
                return;
            }
        }

    }

    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        var units = (<Grid>this.Sketch).Unit.width;
        var centerY = this.OffsetY + (this.Sketch.Height * 0.5);
        var tabY = centerY - (180*units);
        tabY = this.OffsetY;
        var closeY = tabY + (30*units);
        var halfWidth = ((this.Sketch.Width/7)*4)*0.5;

        this._RollOvers[0] = this.HitRect((this.Sketch.Width*0.5) + halfWidth, closeY - (20*units),40*units,40*units, point.x, point.y); // close

        // CATEGORY HIT TEST //
        for (var i=0; i<this.MenuItems.length; i++) {
            var cat = this.MenuItems[i];
            cat.Hover = this.HitRect(cat.Position.x - (cat.Size.width*0.5) + (2*units), tabY + (5*units), cat.Size.width - (4*units), (this.Height*units) - (10*units), point.x, point.y );
        }
    }

    MouseUp(point) {
    }

}

export = SettingsPanel;
