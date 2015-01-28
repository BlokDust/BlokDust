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

    constructor (position: Point, size: Size, name: string) {
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.Selected = 0;
        this.Hover = false;
    }

    Draw(ctx,units,x) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = App.Palette[8];// White
        var dataType = units*10;


        // NAME //
        ctx.fillText(this.Name,x,this.Position.y + (40*units));


        // INFO //
        var ix = x - (48*units);
        var iy = this.Position.y - (20*units);
        var diamond = 12;
        ctx.beginPath();
        ctx.moveTo(ix - (diamond*units), iy);
        ctx.lineTo(ix, iy - (diamond*units));
        ctx.lineTo(ix + (diamond*units), iy);
        ctx.lineTo(ix, iy + (diamond*units));
        ctx.closePath();
        ctx.stroke();
        ctx.fillText("?",ix,iy + (dataType*0.38));


        // BLOCK // (TEMP)
        ctx.beginPath();
        ctx.moveTo(x - (20*units), this.Position.y - (20*units));
        ctx.lineTo(x + (20*units), this.Position.y + (20*units));
        ctx.moveTo(x + (20*units), this.Position.y - (20*units));
        ctx.lineTo(x - (20*units), this.Position.y + (20*units));
        ctx.stroke();

    }
}

export = MenuItem;