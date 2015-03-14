/**
 * Created by luketwyman on 01/02/2015.
 */
import BlocksSketch = require("./../BlocksSketch");
import DisplayObject = require("../DisplayObject");

class TrashCan extends DisplayObject {

    private _RollOver: boolean;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this._RollOver = false;
    }

    Draw() {
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        var ctx = this.Ctx;
        var tx = (<BlocksSketch>this.Sketch).Width - (30*units);
        var ty = (<BlocksSketch>this.Sketch).Height - (30*units);
        var s = 1;
        if (this._RollOver && (<BlocksSketch>this.Sketch).IsDraggingABlock) {
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
        var units = (<BlocksSketch>this.Sketch).Unit.width;
        this._RollOver = this.HudCheck((<BlocksSketch>this.Sketch).Width - (60*units),(<BlocksSketch>this.Sketch).Height - (60*units),(60*units), (60*units), point.x, point.y);
    }

    MouseUp() {
        if (this._RollOver) {
            (<BlocksSketch>this.Sketch).DeleteSelectedBlock();
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