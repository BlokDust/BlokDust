/**
 * Created by luketwyman on 27/01/2015.
 */
import Size = minerva.Size;
import Grid = require("./../Grid");
import BlocksSketch = require("./../BlocksSketch");
import DisplayObject = require("../DisplayObject");

class ZoomButtons extends DisplayObject {

    public InRoll: boolean;
    public OutRoll: boolean;
    private _InPos: Point;
    private _OutPos: Point;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.InRoll = this.OutRoll = false;
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        this._InPos = new Point(30*units,(<BlocksSketch>this.Sketch).Height - (30*units));
        this._OutPos = new Point(70*units,(<BlocksSketch>this.Sketch).Height - (30*units));

    }

    UpdatePositions() {
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        this._InPos = new Point(30*units,(<BlocksSketch>this.Sketch).Height - (30*units));
        this._OutPos = new Point(70*units,(<BlocksSketch>this.Sketch).Height - (30*units));
    }

    Draw() {
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        var ctx = this.Ctx;

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
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        var zin = this._InPos;
        var zout = this._OutPos;
        var area = (30*units);

        this.InRoll = this.HitRect(zin.x - (area*0.5),zin.y - (area*0.5),area, area,point.x,point.y);
        this.OutRoll = this.HitRect(zout.x - (area*0.5),zout.y - (area*0.5),area, area,point.x,point.y);

    }

    MouseDown(point) {

        if (this.InRoll) {
            (<BlocksSketch>this.Sketch).ZoomIn();
        }
        if (this.OutRoll) {
            (<BlocksSketch>this.Sketch).ZoomOut();
        }


    }

}

export = ZoomButtons;