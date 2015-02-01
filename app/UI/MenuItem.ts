/**
 * Created by luketwyman on 28/01/2015.
 */

import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import BlocksSketch = require("./../BlocksSketch");
import Recorder = require("../Blocks/Sources/Recorder");
import IBlock = require("../Blocks/IBlock");

class MenuItem {

    public Position: Point;
    public Size: Size;
    public Name: string;
    public ID: string;
    public Selected: number;
    public Hover: boolean;
    private _Sketch: BlocksSketch;
    private _MouseDown: boolean;
    private _MousePoint: Point;

    constructor (position: Point, size: Size, name: string, id: string, sketch: BlocksSketch) {
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.ID = id;
        this.Selected = 0;
        this.Hover = false;
        this._Sketch = sketch;
        this._MouseDown = false;
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
        ctx.lineWidth = 1;
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

        if (this._MouseDown) {
            /*ctx.lineWidth = 2;
            var ay = this._MousePoint.y - (0*units);
            var ax = this._MousePoint.x + (45*units);
            if (x > (this._Sketch.Width*0.5)) {
                ax = this._MousePoint.x - (45*units);
            }

            ay = this.Position.y + (48*units);
            ax = this.Position.x;

            ctx.beginPath();
            ctx.moveTo(ax - (5*units), ay);
            ctx.lineTo(ax, ay + (5*units));
            ctx.lineTo(ax + (5*units), ay);
            ctx.stroke();*/

            ctx.globalAlpha = 0.5;
            this._Sketch.BlockSprites.Draw(this._MousePoint,false,this.Name.toLowerCase());
        }
    }

    MouseDown(point) {
        this._MouseDown = true;
        this._MousePoint = new Point(point.x,point.y);
    }

    MouseMove(point,header,cutoff) {
        if (this._MouseDown) {
            this._MousePoint = new Point(point.x,point.y);

            // CREATE BLOCK //
            if (point.y > cutoff) {
                header.ClosePanel();
                this._MouseDown = false;
                this._Sketch.CreateBlockFromString(this.ID);
            }
        }
    }

    MouseUp() {
        this._MouseDown = false;
    }


}

export = MenuItem;