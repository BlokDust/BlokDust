/**
 * Created by luketwyman on 28/01/2015.
 */

import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import BlocksSketch = require("./../BlocksSketch");
import Recorder = require("../Blocks/Sources/Recorder");
import LFO = require("../Blocks/Effects/LFO");
import IBlock = require("../Blocks/IBlock");

class MenuItem {

    public Position: Point;
    public Size: Size;
    public Name: string;
    public ID;
    public Description: string;
    public Selected: number;
    public Hover: boolean;
    public InfoHover: boolean;
    public BackHover: boolean;
    public InfoOffset: number;
    private _Sketch: BlocksSketch;
    public MouseIsDown: boolean;
    public MousePoint: Point;

    constructor (position: Point, size: Size, name: string, id, description: string, sketch: BlocksSketch) {
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.ID = id;
        this.Description = description;
        this.Selected = 0;
        this.Hover = false;
        this.InfoHover = false;
        this.BackHover = false;
        this.InfoOffset = 0;
        this._Sketch = sketch;
        this.MouseIsDown = false;
    }

    Draw(ctx,units,x: number,y: number) {
        ctx.globalAlpha = 1;
        var y = this.Position.y - (y*units) - (this.InfoOffset*units);

        // NAME //
        ctx.fillStyle = ctx.strokeStyle = App.Palette[8];// White
        var dataType = units*10;
        ctx.textAlign = "center";
        ctx.font = "400 " + dataType + "px Dosis";
        ctx.fillText(this.Name,x,y + (40*units));


        // INFO BUTTON //
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


        if (this.InfoOffset!==0) {
            // INFO ARROW //
            ctx.lineWidth = 2;
            var ay = y + (this.Size.Height*1.5) - (30*units);
            ctx.beginPath();
            ctx.moveTo(x - (diamond*units), ay);
            ctx.lineTo(x, ay + (diamond*units));
            ctx.lineTo(x + (diamond*units), ay);
            ctx.stroke();


            // INFO TEXT //
            ctx.textAlign = "left";
            var bodyType = units*7.5;
            ctx.font = "300 italic " + bodyType + "px Merriweather Sans";
            this.PrintAtWordWrap(ctx,this.Description, x -(this.Size.Width*0.5) + (10*units),y + this.Size.Height - (30*units), bodyType*1.5, (this.Size.Width) - (20*units));


            // VERTICAL LINES //
            ctx.strokeStyle = "#393d43";// Grey
            ctx.beginPath();
            ctx.moveTo(Math.round(x - (this.Size.Width*0.5))+1,y + (this.Size.Height*0.5) + (20*units));
            ctx.lineTo(Math.round(x - (this.Size.Width*0.5))+1,y + (this.Size.Height*1.5) - (20*units));
            ctx.moveTo(Math.round(x + (this.Size.Width*0.5))-1,y + (this.Size.Height*0.5) + (20*units));
            ctx.lineTo(Math.round(x + (this.Size.Width*0.5))-1,y + (this.Size.Height*1.5) - (20*units));
            ctx.stroke();
        }


        // ICON //
        this._Sketch.BlockSprites.Draw(new Point(x,y-(7.5*units)),false,this.Name.toLowerCase());

    }

    PrintAtWordWrap( context , text, x, y, lineHeight, fitWidth) {
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


    MouseDown(point) {
        this.MouseIsDown = true;
        this.MousePoint = new Point(point.x,point.y);
    }

    MouseMove(point,header,cutoff) {

        if (this.MouseIsDown && this.InfoOffset==0) {
            this.MousePoint = new Point(point.x,point.y);

            // CREATE BLOCK //
            if (point.y > cutoff) {
                header.ClosePanel();
                this.MouseIsDown = false;
                this._Sketch.CreateBlockFromType(this.ID);
            }
        }
    }

    MouseUp() {
        this.MouseIsDown = false;
    }


}

export = MenuItem;