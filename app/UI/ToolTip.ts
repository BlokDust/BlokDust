/**
 * Created by luketwyman on 26/01/2015.
 */
import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import IBlock = require("./../Blocks/IBlock");
import BlocksSketch = require("./../BlocksSketch");

var MAX_FPS: number = 100;
var MAX_MSPF: number = 1000 / MAX_FPS;

class ToolTip {

    private _Ctx: CanvasRenderingContext2D;
    private _Sketch: BlocksSketch;
    public Name: string;
    public Alpha: number;
    public Open: boolean;
    public Position: Point;

    private _Timer: Fayde.ClockTimer;
    private _LastVisualTick: number = new Date(0).getTime();


    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {

        this._Ctx = ctx;
        this._Sketch = sketch;
        this.Name = "";
        this.Alpha = 0;
        this.Open = false;
        this.Position = new Point(0,0);

        this._Timer = new Fayde.ClockTimer();
        this._Timer.RegisterTimer(this);

    }

    OnTicked (lastTime: number, nowTime: number) {
        var now = new Date().getTime();
        if (now - this._LastVisualTick < MAX_MSPF) return;
        this._LastVisualTick = now;

        TWEEN.update(nowTime);
    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------


    Draw() {



        var units = this._Sketch.Unit.width;
        var ctx = this._Ctx;
        var dataType = Math.round(units*10);
        var thisAlpha = this.Alpha/100;

        ctx.font = "400 " + dataType + "px Dosis";
        var thisWidth = ctx.measureText(this.Name.toUpperCase()).width + (40*units);
        var x = this.Position.x + (this._Sketch.ScaledCellWidth.width*0);
        var y = this.Position.y;

        // BG //
        ctx.globalAlpha = thisAlpha*0.9;
        ctx.fillStyle = "#000";

        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x + thisWidth,y);
        ctx.lineTo(x + thisWidth,y + (20*units));
        ctx.lineTo(x + (20*units),y + (20*units));
        ctx.closePath();
        ctx.fill();

        // NAME //
        ctx.globalAlpha = thisAlpha;
        ctx.fillStyle = App.Palette[8]; // WHITE
        ctx.textAlign = "left";
        ctx.fillText(this.Name.toUpperCase(), x + (30*units), y + (10*units) + (dataType*0.36));
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    AlphaTo(panel,destination,t) {

        console.log("dest: " + destination);

        var psTween = new TWEEN.Tween({x: this.Alpha});
        psTween.to({x: destination}, t);
        psTween.onUpdate(function () {
            panel.Alpha = this.x;
        });
        psTween.onComplete(function () {
            if (!panel.Open) {
                panel.Alpha = 0;
            }

        });
        psTween.easing(TWEEN.Easing.Quintic.InOut);
        psTween.start(this._LastVisualTick);


    }


}

export = ToolTip;