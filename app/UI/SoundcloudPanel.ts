/**
 * Created by luketwyman on 26/07/2015.
 */


import Size = minerva.Size;
import Grid = require("./../Grid");
import DisplayObject = require("../DisplayObject");
import BlocksSketch = require("./../BlocksSketch");

class SoundcloudPanel extends DisplayObject{

    public Open: boolean;
    public OffsetX: number;
    public OffsetY: number;
    private _CopyJson;
    public SearchString: string;
    private _RollOvers: boolean[];
    private _Page:number = 1;
    private _ItemNo:number = 5;
    private _CharLimit:number = 65;
    private _Blink = 0;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Open = false;

        this.OffsetX = 0;
        this.OffsetY = -this.Sketch.Height;

        this._RollOvers = [];
        this.SearchString = "Hello";



        this._CopyJson = {
            genUrl: "Generate share link",
            shareLine: "Made something cool? Generate your own unique link to share it with the world (We'd love to see):",
            copyLine: "Share your creation with this unique URL:",
            titleLine: "Title",
            searchLine: "Search SoundCloud",
            domain: "?c=",
            facebook: "post to facebook",
            twitter: "post to twitter",
            google: "post to google +",
            bookmark: "bookmark creation",
            save: "overwrite",
            saveAs: "create new",
            saving: "saving...",
            tweetText: "I made this @blokdust creation: "
        };



    }


    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {

        var ctx = this.Ctx;
        var midType = App.Metrics.TxtMid;
        var headType = App.Metrics.TxtHeader;
        var urlType = App.Metrics.TxtUrl;
        var italicType = App.Metrics.TxtItalic2;
        var units = App.Unit;
        var centerY = this.OffsetY + (App.Height * 0.5);
        var shareX = this.OffsetX + App.Width;
        var buttonY = centerY + (35*units);
        var appWidth = App.Width;
        var appHeight = App.Height;
        var margin = (appWidth*0.5) - (210*units);
        var pageW = (420*units);

        if (this.Open) {


            // BG //
            ctx.fillStyle = App.Palette[2];// Black
            ctx.globalAlpha = 0.95;
            ctx.fillRect(0,this.OffsetY,appWidth,appHeight);


            ctx.globalAlpha = 1;


            // RESULTS //
            ctx.fillStyle = App.Palette[8]; // White
            ctx.strokeStyle = App.Palette[1]; // Grey
            ctx.lineWidth = 2;
            var block = App.BlocksSketch.OptionsPanel.SelectedBlock;
            var results = block.SearchResults.length;
            var itemNo = this._ItemNo;
            var pageNo = this._Page;
            ctx.font = App.Metrics.TxtItalic;
            ctx.textAlign = "left";

            // TRACKS //


            //clipping path //
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(margin - (5*units), centerY - (100*units));
            ctx.lineTo(margin - (5*units), centerY + (130*units));
            ctx.lineTo(margin + pageW + (10*units), centerY + (130*units));
            ctx.lineTo(margin + pageW + (10*units), centerY - (100*units));
            ctx.closePath();
            ctx.clip();

            // track loop //

            for (var i=0; i<results; i++) {
                var p = Math.floor(i/itemNo);
                var n = i - (p * itemNo);
                var x = this.OffsetX + ((pageW + (10*units)) * p);
                var y = centerY - (70*units) + ((n*40)*units);

                if (p>(this._Page-4) && p<(this._Page+2)) { // range to draw

                    // divider //
                    if (n<4 && i<(results-1)) {
                        ctx.beginPath();
                        ctx.moveTo(x + margin, y + (12*units));
                        ctx.lineTo(x + margin + pageW, y + (12*units));
                        ctx.stroke();
                    }

                    // rollover //
                    if (p==(this._Page-1)) {
                        if (this._RollOvers[5+n]) {
                            var sy = centerY - (98*units) + ((40*n)*units);
                            ctx.fillStyle = App.Palette[4]; // Col
                            ctx.fillRect(margin - (5*units),sy,pageW + (10*units),40*units);
                            ctx.beginPath();
                            ctx.moveTo((appWidth*0.5), sy + (45*units));
                            ctx.lineTo((appWidth*0.5) - (10*units), sy + (35*units));
                            ctx.lineTo((appWidth*0.5) + (10*units), sy + (35*units));
                            ctx.closePath();
                            ctx.fill();
                        }
                    }

                    // text //
                    ctx.fillStyle = App.Palette[8]; // White
                    //TODO copy these into string array(s) so query not made every draw frame
                    var track = block.SearchResults[i];
                    var title = track.title;
                    var user = track.user.username;
                    if (title.length>this._CharLimit) {
                    title = title.substring(0,this._CharLimit) + "...";
                    }
                    if (user.length>this._CharLimit) {
                        user = user.substring(0,this._CharLimit) + "...";
                    }
                    ctx.fillText(title.toUpperCase(), x + margin + units, y - (10*units));
                    ctx.fillText("By "+this.Capitalise(user), x + margin + units, y);



                    // arrow //
                    ctx.strokeStyle = App.Palette[8];
                    ctx.beginPath();
                    ctx.moveTo(x + margin + pageW - (25 * units), y - (10.5*units));
                    ctx.lineTo(x + margin + pageW - (20 * units), y - (5.5*units));
                    ctx.lineTo(x + margin + pageW - (15 * units), y - (10.5*units));
                    ctx.stroke();
                    ctx.strokeStyle = App.Palette[1];
                }
            }
            ctx.restore();


            ctx.font = App.Metrics.TxtMid;
            var maxNo = itemNo*pageNo;
            if (maxNo > results) {
                maxNo = results;
            }

            // ITEM NUMBERS //
            if (results > 0) {
                ctx.fillText("" + (1 + (itemNo * (pageNo - 1))) + " - " + maxNo + " of " + results, margin, centerY + (160 * units));
            }
            if (results > itemNo) {
                // PAGE NO //
                ctx.font = App.Metrics.TxtHeader;

                var pNo = ""+this._Page;
                /*if (this._Page<10) {
                    pNo = "0"+this._Page;
                }*/
                var pTotal = ""+Math.ceil(results/itemNo);
                /*if (Math.ceil(results/itemNo)<10) {
                    pTotal = "0"+Math.ceil(results/itemNo)
                }*/
                /*ctx.textAlign = "right";
                ctx.fillText(pNo, margin - (80*units), centerY - (75*units));*/
                ctx.textAlign = "center";
                ctx.fillText(pNo + "/" + pTotal, margin - (75*units), centerY - (68*units));
                /*ctx.textAlign = "left";
                ctx.fillText(pTotal, margin - (70*units), centerY - (55*units));*/
                /*ctx.textAlign = "left";
                ctx.fillText(pNo + "/" + pTotal, margin - units, centerY + (145*units));*/
            }


            // BACK ARROW //
            ctx.strokeStyle = App.Palette[1]; // Grey
            if (this._Page>1) {
                ctx.strokeStyle = App.Palette[8]; // White
            }
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) - (275 * units), centerY - (20*units));
            ctx.lineTo((appWidth*0.5) - (295 * units), centerY);
            ctx.lineTo((appWidth*0.5) - (275 * units), centerY + (20*units));
            ctx.stroke();

            // FORWARD ARROW //
            ctx.strokeStyle = App.Palette[1]; // Grey
            if (this._Page < Math.ceil(results/itemNo)) {
                ctx.strokeStyle = App.Palette[8]; // White
            }
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (275 * units), centerY - (20*units));
            ctx.lineTo((appWidth*0.5) + (295 * units), centerY);
            ctx.lineTo((appWidth*0.5) + (275 * units), centerY + (20*units));
            ctx.stroke();


            // TITLE //
            ctx.strokeStyle = App.Palette[8]; // White
            /*ctx.textAlign = "right";
            ctx.font = App.Metrics.TxtMid;
            ctx.fillText(this._CopyJson.searchLine.toUpperCase(), (appWidth*0.5) - (225*units), centerY - (126*units) );*/
            ctx.beginPath();
            ctx.moveTo(margin, centerY - (110*units));
            ctx.lineTo(margin + pageW, centerY - (110*units));
            ctx.stroke();
            ctx.textAlign = "left";
            ctx.font = headType;
            ctx.fillText(this.SearchString.toUpperCase(), margin, centerY - (120*units) );
            var titleW = ctx.measureText(this.SearchString.toUpperCase()).width;

            // TYPE BAR //
            if (this._Blink > 50) {
                ctx.fillRect(margin + titleW + (5*units),centerY - (143*units),2*units,26*units);
            }
            this._Blink += 1;
            if (this._Blink == 100) {
                this._Blink = 0;
            }


            // SEARCH BUTTON //
            ctx.font = midType;
            var searchW = ctx.measureText(this._CopyJson.searchLine.toUpperCase()).width;
            ctx.fillText(this._CopyJson.searchLine.toUpperCase(), (appWidth*0.5) + (205*units) - searchW, centerY - (126*units) );


            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (210*units), centerY - (140*units));
            ctx.lineTo((appWidth*0.5) + (200*units) - searchW, centerY - (140*units));
            ctx.lineTo((appWidth*0.5) + (200*units) - searchW, centerY - (120*units));
            ctx.lineTo((appWidth*0.5) + (210*units), centerY - (120*units));
            ctx.closePath();
            ctx.stroke();


            // CLOSE BUTTON //
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (222.5*units), centerY - (142.5*units));
            ctx.lineTo((appWidth*0.5) + (237.5*units), centerY - (157.5*units));
            ctx.moveTo((appWidth*0.5) + (237.5*units), centerY - (142.5*units));
            ctx.lineTo((appWidth*0.5) + (222.5*units), centerY - (157.5*units));
            ctx.stroke();


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

    Capitalise(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
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
        this.OffsetY = -App.Height;
        this.DelayTo(this,0,500,0,"OffsetY");

    }

    ClosePanel() {
        this.DelayTo(this,-App.Height,500,0,"OffsetY");
    }




    MouseDown(point) {
        this.HitTests(point);

        var block = App.BlocksSketch.OptionsPanel.SelectedBlock;


        if (this._RollOvers[1]) { // close
            this.ClosePanel();
            return;
        }
        if (this._RollOvers[2]) { // search
            App.BlocksSketch.OptionsPanel.SelectedBlock.Search(this.RandomSearch());
            this._Page = 1;
            this.OffsetX = 0;
            return;
        }
        if (this._RollOvers[3]) { // back arrow
            if (this._Page > 1) {
                this._Page -= 1;
                this.DelayTo(this,- ((this._Page-1) * (430*App.Unit)),350,0,"OffsetX");
            }
            return;
        }
        if (this._RollOvers[4]) { // next arrow
            if (this._Page < Math.ceil(block.SearchResults.length/this._ItemNo)) {
                this._Page += 1;
                this.DelayTo(this,- ((this._Page-1) * (430*App.Unit)),350,0,"OffsetX");
            }
            return;
        }

        for (var i=5; i<10; i++) {
            if (this._RollOvers[i]) { // links
                var n = ((this._Page-2)*this._ItemNo)+i;
                var track = block.SearchResults[n];
                if (track) {
                    block.LoadTrack(track);
                    this.ClosePanel();
                }


                return;
            }
        }




    }

    MouseUp(point) {
    }

    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        var units = App.Unit;
        var shareX = this.OffsetX + App.Width;
        var centerY = this.OffsetY + (App.Height * 0.5);
        var buttonY = centerY + (35*units);
        var ctx = this.Ctx;
        var midType = App.Metrics.TxtMid;
        var appWidth = App.Width;


        ctx.font = midType;
        var searchW = ctx.measureText(this._CopyJson.searchLine.toUpperCase()).width;

        this._RollOvers[0] = this.HitRect(shareX + (appWidth*0.5) - (210*units), centerY - (20*units),420*units,40*units, point.x, point.y); // url
        this._RollOvers[1] = this.HitRect((appWidth*0.5) + (210*units), centerY - (170*units),40*units,40*units, point.x, point.y); // close
        this._RollOvers[2] = this.HitRect((appWidth*0.5) + (200*units) - searchW, centerY - (150*units),searchW + (10*units),40*units, point.x, point.y); // search
        this._RollOvers[3] = this.HitRect((appWidth*0.5) - (300*units),centerY - (units*20),30*units,40*units, point.x, point.y); // back
        this._RollOvers[4] = this.HitRect((appWidth*0.5) + (270*units),centerY - (units*20),30*units,40*units, point.x, point.y); // next

        this._RollOvers[5] = this.HitRect((appWidth*0.5) - (210*units),centerY - (units*98),420*units,40*units, point.x, point.y); // 1
        this._RollOvers[6] = this.HitRect((appWidth*0.5) - (210*units),centerY - (units*58),420*units,40*units, point.x, point.y); // 2
        this._RollOvers[7] = this.HitRect((appWidth*0.5) - (210*units),centerY - (units*18),420*units,40*units, point.x, point.y); // 3
        this._RollOvers[8] = this.HitRect((appWidth*0.5) - (210*units),centerY + (units*22),420*units,40*units, point.x, point.y); // 4
        this._RollOvers[9] = this.HitRect((appWidth*0.5) - (210*units),centerY + (units*62),420*units,40*units, point.x, point.y); // 5
    }

    RandomSearch() {
        var words = ['shoe','cat','dog','horse','train','snow','petrol','paper','flower','clock','car','skull','space','dust','metal','flag','chips','dome','red','hand','gang','wet','dance','patrol','arm','gun','land','brick','camel','sun','night','rain','blood'];
        var q = ""+ words[Math.floor(Math.random()*words.length)] + " " + words[Math.floor(Math.random()*words.length)];
        this.SearchString = q;
        return q;
    }

}

export = SoundcloudPanel;