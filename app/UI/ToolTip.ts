/**
 * Created by luketwyman on 26/01/2015.
 */
import App = require("../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import IBlock = require("./../Blocks/IBlock");
import BlocksSketch = require("./../BlocksSketch");
import DisplayObject = require("../DisplayObject");

class ToolTip extends DisplayObject {

    public Name: string;
    public Alpha: number;
    public Open: boolean;
    public Position: Point;
    private _AlphaTween: TWEEN.Tween;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Name = "";
        this.Alpha = 0;
        this.Open = false;
        this.Position = new Point(0,0);
    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------


    Draw() {

        var units = (<BlocksSketch>this.Sketch).Unit.width;
        var ctx = this.Ctx;
        var dataType = Math.round(units*10);
        var thisAlpha = this.Alpha/100;

        ctx.font = "400 " + dataType + "px Dosis";
        var thisWidth = ctx.measureText(this.Name.toUpperCase()).width + (40*units);
        var x = this.Position.x + ((<BlocksSketch>this.Sketch).ScaledCellWidth.width*0);
        var y = this.Position.y;

        // BG //
        ctx.globalAlpha = thisAlpha*0.9;
        ctx.fillStyle = window.App.Palette[2];// Black

        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x + thisWidth,y);
        ctx.lineTo(x + thisWidth,y + (20*units));
        ctx.lineTo(x + (20*units),y + (20*units));
        ctx.closePath();
        ctx.fill();

        // NAME //
        ctx.globalAlpha = thisAlpha;
        ctx.fillStyle = window.App.Palette[8]; // WHITE
        ctx.textAlign = "left";
        ctx.fillText(this.Name.toUpperCase(), x + (30*units), y + (10*units) + (dataType*0.36));
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    AlphaTo(panel,destination,t) {

        if (this._AlphaTween) {
            this._AlphaTween.stop();
        }
        this._AlphaTween = new TWEEN.Tween({x: this.Alpha});
        this._AlphaTween.to({x: destination}, t);
        this._AlphaTween.onUpdate(function () {
            panel.Alpha = this.x;
        });
        this._AlphaTween.easing(TWEEN.Easing.Quintic.InOut);
        this._AlphaTween.start(this.LastVisualTick);
    }


}

export = ToolTip;