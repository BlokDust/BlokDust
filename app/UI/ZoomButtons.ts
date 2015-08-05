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
    public Tweens: any[];
    private _ZoomSlots: number[];
    private _CurrentSlot: number;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.InRoll = this.OutRoll = false;
        var units = App.Unit;
        this._InPos = new Point(30*units,App.Height - (30*units));
        this._OutPos = new Point(70*units,App.Height - (30*units));
        this.Tweens = [];

        this._ZoomSlots = [0.25,0.5,1,2,4];
        this._CurrentSlot = 2;
    }

    UpdatePositions() {
        var units = App.Unit;
        this._InPos = new Point(30*units,App.Height - (30*units));
        this._OutPos = new Point(70*units,App.Height - (30*units));
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        var units = App.Unit;
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

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v){

        var offsetTween = new TWEEN.Tween({x: panel[""+v]});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;
            panel.Metrics.UpdateGridScale();
        });
        offsetTween.easing(TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.LastVisualTick);

        this.Tweens.push(offsetTween);
    }

    StopAllTweens() {
        if (this.Tweens.length) {
            for (var j=0; j<this.Tweens.length; j++) {
                this.Tweens[j].stop();
            }
            this.Tweens = [];
        }
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseMove(point) {
        var units = App.Unit;
        var zin = this._InPos;
        var zout = this._OutPos;
        var area = (30*units);

        this.InRoll = this.HitRect(zin.x - (area*0.5),zin.y - (area*0.5),area, area,point.x,point.y);
        this.OutRoll = this.HitRect(zout.x - (area*0.5),zout.y - (area*0.5),area, area,point.x,point.y);

    }

    MouseDown(point) {

        if (this.InRoll) {
            this.ZoomIn();
        }
        if (this.OutRoll) {
            this.ZoomOut();
        }
    }


    ZoomIn() {
        if (this._CurrentSlot<this._ZoomSlots.length-1) {
            this._CurrentSlot +=1;
            this.DelayTo(App,this._ZoomSlots[this._CurrentSlot],500,0,"ZoomLevel");
        }
    }

    ZoomOut() {
        if (this._CurrentSlot>0) {
            this._CurrentSlot -=1;
            this.DelayTo(App,this._ZoomSlots[this._CurrentSlot],500,0,"ZoomLevel");
        }
    }



}

export = ZoomButtons;