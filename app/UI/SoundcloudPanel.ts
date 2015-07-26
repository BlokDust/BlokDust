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
    private _Page = 1;
    private _ItemNo = 5;

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
            searchLine: "Search",
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

        if (this.Open) {


            // BG //
            ctx.fillStyle = App.Palette[2];// Black
            ctx.globalAlpha = 0.95;
            ctx.fillRect(0,this.OffsetY,appWidth,appHeight);


            ctx.globalAlpha = 1;


            // RESULTS //
            ctx.fillStyle = ctx.strokeStyle = App.Palette[8]; // White
            var block = App.BlocksSketch.SelectedBlock;
            var itemNo = this._ItemNo;
            var pageNo = this._Page;
            ctx.font = App.Metrics.TxtItalic;
            ctx.textAlign = "left";
            for (var i=0; i<5; i++) {
                // TRACK //
                var n = i +(itemNo*(pageNo-1));
                if (block.SearchResults[n]) {
                    var track = block.SearchResults[n];
                    ctx.fillText(track.title.toUpperCase(), margin, centerY - (60*units) + ((i*40)*units));
                    ctx.fillText("By "+this.Capitalise(track.user.username), margin, centerY - (50*units) + ((i*40)*units));
                }

            }
            ctx.font = App.Metrics.TxtMid;
            var maxNo = itemNo*pageNo;
            if (maxNo > block.SearchResults.length) {
                maxNo = block.SearchResults.length;
            }

            // ITEM NUMBERS //
            ctx.fillText(""+(1 + (itemNo*(pageNo-1)))+" - "+maxNo+" of "+block.SearchResults.length, margin, centerY + (160*units));
            // PAGE NO //
            ctx.font = App.Metrics.TxtHeader;
            ctx.textAlign = "right";
            var pNo = ""+this._Page;
            if (this._Page<10) {
                pNo = "0"+this._Page;
            }
            ctx.fillText(pNo, margin - (15*units), centerY - (50*units));

            // BACK ARROW //
            ctx.lineWidth = 2;

            if (this._Page>1) {
                ctx.beginPath();
                ctx.moveTo( this.OffsetX + (appWidth*0.5) - (275 * units), centerY - (20*units));
                ctx.lineTo( this.OffsetX + (appWidth*0.5) - (295 * units), centerY);
                ctx.lineTo( this.OffsetX + (appWidth*0.5) - (275 * units), centerY + (20*units));
                ctx.stroke();
            }


            // FORWARD ARROW //
            if (this._Page < Math.ceil(block.SearchResults.length/itemNo)) {
                ctx.beginPath();
                ctx.moveTo( this.OffsetX + (appWidth*0.5) + (275 * units), centerY - (20*units));
                ctx.lineTo( this.OffsetX + (appWidth*0.5) + (295 * units), centerY);
                ctx.lineTo( this.OffsetX + (appWidth*0.5) + (275 * units), centerY + (20*units));
                ctx.stroke();
            }



            // TITLE //
            ctx.textAlign = "right";
            ctx.font = App.Metrics.TxtMid;
            ctx.fillText(this._CopyJson.searchLine.toUpperCase(), (appWidth*0.5) - (225*units), centerY - (106*units) );
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) - (210*units), centerY - (90*units));
            ctx.lineTo((appWidth*0.5) + (210*units), centerY - (90*units));
            ctx.stroke();
            ctx.textAlign = "left";
            ctx.font = headType;
            ctx.fillText(this.SearchString, (appWidth*0.5) - (210*units), centerY - (100*units) );


            // GEN TITLE //
            ctx.font = midType;
            var genW = ctx.measureText(this._CopyJson.searchLine.toUpperCase()).width;
            ctx.fillText(this._CopyJson.searchLine.toUpperCase(), (appWidth*0.5) + (205*units) - genW, centerY - (106*units) );


            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (210*units), centerY - (120*units));
            ctx.lineTo((appWidth*0.5) + (200*units) - genW, centerY - (120*units));
            ctx.lineTo((appWidth*0.5) + (200*units) - genW, centerY - (100*units));
            ctx.lineTo((appWidth*0.5) + (210*units), centerY - (100*units));
            ctx.closePath();
            ctx.stroke();


            // CLOSE BUTTON //
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (222.5*units), centerY - (122.5*units));
            ctx.lineTo((appWidth*0.5) + (237.5*units), centerY - (137.5*units));
            ctx.moveTo((appWidth*0.5) + (237.5*units), centerY - (122.5*units));
            ctx.lineTo((appWidth*0.5) + (222.5*units), centerY - (137.5*units));
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
                panel.OffsetX = 0;
            }
            if (v=="OffsetX" && panel._FirstSession) {
                panel._FirstSession = false;
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




            if (this._RollOvers[1]) { // close
                this.ClosePanel();
                return;
            }
            if (this._RollOvers[2]) { // gen title
                return;
            }
            if (this._RollOvers[3]) { // gen URL
                return;
            }
            if (this._RollOvers[4]) { // save
                return;
            }
            if (this._RollOvers[5]) { // save as
                return;
            }
            if (this._RollOvers[6]) { // fb
                return;
            }
            if (this._RollOvers[7]) { // tw
                return;
            }
            if (this._RollOvers[8]) { // google
                return;
            }
            if (this._RollOvers[9]) { // back arrow
                //this.DelayTo(this,0,500,0,"OffsetX");
                this._Page -= 1;
                return;
            }
            if (this._RollOvers[10]) { // skip
                //this.DelayTo(this,-App.Width,500,0,"OffsetX");
                this._Page += 1;
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
        this._RollOvers[1] = this.HitRect((appWidth*0.5) + (210*units), centerY - (150*units),40*units,40*units, point.x, point.y); // close
        this._RollOvers[2] = this.HitRect((appWidth*0.5) + (200*units) - searchW, centerY - (130*units),searchW + (10*units),40*units, point.x, point.y); // gen title
        this._RollOvers[10] = this.HitRect(this.OffsetX + (appWidth*0.5) + (270*units),centerY - (units*20),30*units,40*units, point.x, point.y); // skip
        this._RollOvers[9] = this.HitRect(this.OffsetX + (appWidth*0.5) - (300*units),centerY - (units*20),30*units,40*units, point.x, point.y); // back
    }

}

export = SoundcloudPanel;