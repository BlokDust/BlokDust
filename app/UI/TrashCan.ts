/**
 * Created by luketwyman on 01/02/2015.
 */
import BlocksSketch = require("./../BlocksSketch");


class TrashCan {

    private _Sketch: BlocksSketch;

    constructor(sketch: BlocksSketch) {

        this._Sketch = sketch;

    }

    MouseUp(point) {
        var sketch = this._Sketch;
        var units = sketch.Unit.width;

        var canOver = this.HudCheck(sketch.Width - (60*units),sketch.Height - (60*units),(60*units), (60*units), point.x, point.y);
        if (canOver) {
            sketch.DeleteSelectedBlock();
        }

    }

    // IS CLICK WITHIN THIS BOX //
    HudCheck(x,y,w,h,mx,my) {
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }

}

export = TrashCan;