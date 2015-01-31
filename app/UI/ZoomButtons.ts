/**
 * Created by luketwyman on 27/01/2015.
 */

import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import BlocksSketch = require("./../BlocksSketch");

class ZoomButtons {

    private _Ctx: CanvasRenderingContext2D;
    private _Sketch: BlocksSketch;
    public InRoll: boolean;
    public OutRoll: boolean;
    private _InPos: Point;
    private _OutPos: Point;

    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {
        this._Ctx = ctx;
        this._Sketch = sketch;
        this.InRoll = this.OutRoll = false;
        var units = this._Sketch.Unit.width;
        this._InPos = new Point(20*units,this._Sketch.Height - (20*units));
        this._OutPos = new Point(60*units,this._Sketch.Height - (20*units));

    }

    UpdatePositions() {
        var units = this._Sketch.Unit.width;
        this._InPos = new Point(20*units,this._Sketch.Height - (20*units));
        this._OutPos = new Point(60*units,this._Sketch.Height - (20*units));
    }

    Draw() {
        var units = this._Sketch.Unit.width;
        var ctx = this._Ctx;

        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = App.Palette[8];// White

        var zin = this._InPos;
        var zout = this._OutPos;
        var diamond = 11;


        // IN //
        ctx.beginPath();
        ctx.moveTo(zin.x, zin.y - (5*units));
        ctx.lineTo(zin.x, zin.y + (5*units));
        ctx.moveTo(zin.x - (5*units), zin.y);
        ctx.lineTo(zin.x + (5*units), zin.y);
        ctx.stroke();


        // OUT //
        ctx.beginPath();
        ctx.moveTo(zout.x - (5*units), zout.y);
        ctx.lineTo(zout.x + (5*units), zout.y);
        ctx.stroke();


        ctx.lineWidth = 1;

        // DIVIDE //
        var x = zin.x + ((zout.x-zin.x)*0.5);
        ctx.beginPath();
        ctx.moveTo(x, zin.y - (diamond*units));
        ctx.lineTo(x, zin.y + (diamond*units));
        ctx.closePath();
        ctx.stroke();

        // ROLLOVERS //
        if (this.InRoll) {
            ctx.beginPath();
            ctx.moveTo(zin.x - (diamond*units), zin.y);
            ctx.lineTo(zin.x, zin.y - (diamond*units));
            ctx.lineTo(zin.x + (diamond*units), zin.y);
            ctx.lineTo(zin.x, zin.y + (diamond*units));
            ctx.closePath();
            ctx.stroke();
        }
        if (this.OutRoll) {
            ctx.beginPath();
            ctx.moveTo(zout.x - (diamond*units), zout.y);
            ctx.lineTo(zout.x, zout.y - (diamond*units));
            ctx.lineTo(zout.x + (diamond*units), zout.y);
            ctx.lineTo(zout.x, zout.y + (diamond*units));
            ctx.closePath();
            ctx.stroke();
        }




    }

    MouseMove(point) {
        var units = this._Sketch.Unit.width;
        var zin = this._InPos;
        var zout = this._OutPos;
        var area = (30*units);

        this.InRoll = this.HudCheck(zin.x - (area*0.5),zin.y - (area*0.5),area, area,point.x,point.y);
        this.OutRoll = this.HudCheck(zout.x - (area*0.5),zout.y - (area*0.5),area, area,point.x,point.y);

    }

    MouseDown(point) {

        if (this.InRoll) {
            this._Sketch.ZoomIn();
        }
        if (this.OutRoll) {
            this._Sketch.ZoomOut();
        }


    }

    // IS CLICK WITHIN THIS BOX //
    HudCheck(x,y,w,h,mx,my) {
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }

}

export = ZoomButtons;