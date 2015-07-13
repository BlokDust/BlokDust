/**
 * Created by luketwyman on 12/07/2015.
 */
import BlocksSketch = require("./../BlocksSketch");
import IEffect = require("../Blocks/IEffect");
import ISource = require("../Blocks/ISource");
import IBlock = require("../Blocks/IBlock");
import DisplayObject = require("../DisplayObject");
import RecorderBlock = require("../Blocks/Sources/Recorder");

class RecorderPanel extends DisplayObject {

    private _Blocks: RecorderBlock[];
    private _Roll: boolean[];
    public Hover: boolean;


    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this._Blocks = [];
        this._Roll = [];
        this.Hover = false;

    }

    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------


    Update() {
        // POPULATE LIST OF ACTIVE RECORDER BLOCKS //
        // TODO: THIS IS SHIT - ideal: subscribe to 'blocks changed' event to 'lazy populate' this list
        var blocks = [];
        for (var i = 0; i < App.Blocks.length; i++) {
            var block:IBlock = App.Blocks[i];
            if (block instanceof RecorderBlock) {
                blocks.push(block);
            }
        }
        this._Blocks = blocks;
    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------


    Draw() {

        for (var i = 0; i < this._Blocks.length; i++) {
            var block = this._Blocks[i];
            var myPos = (<BlocksSketch>this.Sketch).ConvertGridUnitsToAbsolute(block.Position);
            myPos = (<BlocksSketch>this.Sketch).ConvertBaseToTransformed(myPos);
            this.DrawPanel(myPos.x,myPos.y,block.IsRecording);
        }
    }

    DrawPanel(x,y,rec) {
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        var grd = (<BlocksSketch>this.Sketch).CellWidth.width;
        var ctx = this.Ctx;

        var w = grd*3;
        var h = grd*3;

        // DRAW PANEL //
        ctx.fillStyle = App.Palette[14];// Shadow
        ctx.globalAlpha = 0.16;
        this.BGDraw(x, y + (5 * units), w, h, ctx);
        ctx.fillStyle = App.Palette[2]; // Black
        ctx.globalAlpha = 0.9;
        this.BGDraw(x, y, w, h, ctx);
        ctx.globalAlpha = 1;


        // BUTTON //
        if (rec) {
            ctx.fillStyle = App.Palette[8]; // WHITE
        } else {
            ctx.fillStyle = App.Palette[13]; // RED
        }
        ctx.beginPath();
        ctx.moveTo(x - grd, y - (w*0.5) - (h*0.5)); // l
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) - grd); // t
        ctx.lineTo(x + grd, y - (w*0.5) - (h*0.5));
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) + grd);
        ctx.closePath();
        ctx.fill();

        if (rec) {
            ctx.fillStyle = App.Palette[8]; // WHITE
        } else {
            ctx.fillStyle = App.Palette[12]; // RED
        }
        ctx.beginPath();
        ctx.moveTo(x - grd, y - (w*0.5) - (h*0.5)); // l
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) - grd); // t
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) + grd);
        ctx.closePath();
        ctx.fill();
    }

    // PANEL BACKGROUND //
    BGDraw(x,y,w,h,ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y); // tl
        ctx.lineTo(x - (w*0.5), y - (w*0.5));
        ctx.lineTo(x - (w*0.5), y - (w*0.5) - (h));
        ctx.lineTo(x + (w*0.5), y - (w*0.5) - (h));
        ctx.lineTo(x + (w*0.5), y - (w*0.5));
        ctx.lineTo(x, y - (w*0.5));
        ctx.closePath();
        ctx.fill();
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(point) {
        this.RolloverCheck(point);

        for (var i = 0; i < this._Blocks.length; i++) {
            if (this._Roll[i]) {
                this._Blocks[i].ToggleRecording();
            }
        }
    }

    MouseMove(point) {
        this.RolloverCheck(point);
    }


    RolloverCheck(point) {
        this.Hover = false;
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        var grd = (<BlocksSketch>this.Sketch).CellWidth.width;

        var w = grd*3;
        var h = grd*3;

        for (var i = 0; i < this._Blocks.length; i++) {
            var block = this._Blocks[i];
            var myPos = (<BlocksSketch>this.Sketch).ConvertGridUnitsToAbsolute(block.Position);
            myPos = (<BlocksSketch>this.Sketch).ConvertBaseToTransformed(myPos);
            this._Roll[i] = this.HudCheck(myPos.x  - (w*0.5), myPos.y - (w*0.5) - (h), w, h, point.x, point.y);
            if (this._Roll[i]==true) {
                console.log("ROLL " + i);
                this.Hover = true;
            }
        }

    }

    //-------------------------------------------------------------------------------------------
    //  MATHS
    //-------------------------------------------------------------------------------------------


    // IS CLICK WITHIN THIS BOX //
    // TODO: Make function of DisplayObject? It's used throughout UI
    HudCheck(x,y,w,h,mx,my) {
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }

}

export = RecorderPanel;