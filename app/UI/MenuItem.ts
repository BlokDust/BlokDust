/**
 * Created by luketwyman on 28/01/2015.
 */

import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");

class MenuItem {

    public Position: Point;
    public Size: Size;
    public Name: string;
    public Selected: number;
    public Hover: boolean;
    private _Sketch: Grid;

    constructor (position: Point, size: Size, name: string, sketch: Grid) {
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.Selected = 0;
        this.Hover = false;
        this._Sketch = sketch;
    }

    Draw(ctx,units,x: number,y: number) {
        ctx.globalAlpha = 1;
        var y = this.Position.y - (y*units);
        this.Position.x = x;

        // NAME //
        ctx.fillStyle = ctx.strokeStyle = App.Palette[8];// White
        var dataType = units*10;
        ctx.fillText(this.Name,x,y + (40*units));


        // INFO //
        var ix = x - (40*units);
        var iy = y - (30*units);
        var diamond = 11;
        ctx.beginPath();
        ctx.moveTo(ix - (diamond*units), iy);
        ctx.lineTo(ix, iy - (diamond*units));
        ctx.lineTo(ix + (diamond*units), iy);
        ctx.lineTo(ix, iy + (diamond*units));
        ctx.closePath();
        ctx.stroke();
        ctx.fillText("?",ix,iy + (dataType*0.38));


        // ICON //
        this._Sketch.BlockSprites.Draw(new Point(x,y-(7.5*units)),false,this.Name.toLowerCase());
    }
}

export = MenuItem;