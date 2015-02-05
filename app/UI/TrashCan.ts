/**
 * Created by luketwyman on 01/02/2015.
 */
import BlocksSketch = require("./../BlocksSketch");


class TrashCan {

    private _Sketch: BlocksSketch;
    private _RollOver: boolean;
    private _Ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {
        this._Ctx = ctx;
        this._Sketch = sketch;
        this._RollOver = false;

    }

    Draw() {
        var units = this._Sketch.Unit.width;
        var ctx = this._Ctx;
        var tx = this._Sketch.Width - (30*units);
        var ty = this._Sketch.Height - (30*units);
        var s = 1;
        if (this._RollOver && this._Sketch.IsDraggingABlock) {
            s = 1.2;
        }

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx - ((11*s)*units), ty - ((11*s)*units)); // tl
        ctx.lineTo(tx + ((11*s)*units), ty - ((11*s)*units)); // tr
        ctx.lineTo(tx + ((8*s)*units), ty + ((11*s)*units)); // br
        ctx.lineTo(tx - ((8*s)*units), ty + ((11*s)*units)); // bl
        ctx.closePath();
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - ((4*s)*units), ty - ((4*s)*units));
        ctx.lineTo(tx + ((4*s)*units), ty + ((4*s)*units));
        ctx.moveTo(tx + ((4*s)*units), ty - ((4*s)*units));
        ctx.lineTo(tx - ((4*s)*units), ty + ((4*s)*units));
        ctx.stroke();

        ctx.lineWidth = 1;

    }

    MouseMove(point) {
        var sketch = this._Sketch;
        var units = sketch.Unit.width;
        this._RollOver = this.HudCheck(sketch.Width - (60*units),sketch.Height - (60*units),(60*units), (60*units), point.x, point.y);
    }

    MouseUp() {
        if (this._RollOver) {
            this._Sketch.DeleteSelectedBlock();
            return true;
        }
        return false;
    }

    // IS CLICK WITHIN THIS BOX //
    HudCheck(x,y,w,h,mx,my) {
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }

}

export = TrashCan;