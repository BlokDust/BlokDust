import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = minerva.Point;
import Size = minerva.Size;
import {IApp} from '../IApp';

declare var App: IApp;

export class ZoomButtons extends DisplayObject {

    public InRoll: boolean;
    public OutRoll: boolean;
    private _InPos: Point;
    private _OutPos: Point;
    public Tweens: any[];
    private _ZoomSlots: number[];
    public CurrentSlot: number;
    public ZoomAlpha: number;

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);

        this.InRoll = this.OutRoll = false;
        this.Tweens = [];

        this._ZoomSlots = [0.25,0.5,1,2,4];
        this.CurrentSlot = 2;
        this.ZoomAlpha = 0;
    }

    UpdateSlot(zoom) {
        this.CurrentSlot = this._ZoomSlots.indexOf(zoom);
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------

    draw() {
        var units = App.Unit;
        var ctx = this.ctx;

        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);

        var zin = this._InPos;
        var zout = this._OutPos;
        var im = 1;
        var om = 1;
        if (this.InRoll) {
            im = 1.2;
        }
        if (this.OutRoll) {
            om = 1.2;
        }
        var diamond = 11;

        // IN //
        ctx.beginPath();
        ctx.moveTo(zin.x, zin.y - ((5*im)*units));
        ctx.lineTo(zin.x, zin.y + ((5*im)*units));
        ctx.moveTo(zin.x - ((5*im)*units), zin.y);
        ctx.lineTo(zin.x + ((5*im)*units), zin.y);
        ctx.stroke();

        // OUT //
        ctx.beginPath();
        ctx.moveTo(zout.x - ((5*om)*units), zout.y);
        ctx.lineTo(zout.x + ((5*om)*units), zout.y);
        ctx.stroke();

        ctx.lineWidth = 1;

        // DIVIDE //
        var x = zin.x + ((zout.x-zin.x)*0.5);
        ctx.beginPath();
        ctx.moveTo(x, zin.y - (diamond*units));
        ctx.lineTo(x, zin.y + (diamond*units));
        ctx.closePath();
        ctx.stroke();

        /*// ROLLOVERS //
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
        }*/

        if (this.ZoomAlpha>0) {
            ctx.globalAlpha = this.ZoomAlpha;
            ctx.textAlign = "center";
            ctx.font = App.Metrics.TxtUrl2;
            var string = "x " + (Math.round(App.ZoomLevel * 100) / 100);
            ctx.fillText(string,50*units,App.Height - (50*units));
        }

        ctx.globalAlpha = 1;
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------

    DelayTo(panel,destination,t,delay,v){

        var offsetTween = new window.TWEEN.Tween({x: panel[""+v]});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;
            if (v==="ZoomLevel") {
                panel.Metrics.UpdateGridScale();
            }
        });
        offsetTween.easing(window.TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.lastVisualTick);

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
        this.HitTests(point);
    }

    MouseDown(point) {
        this.HitTests(point);
        if (this.InRoll) {
            this.ZoomIn();
        }
        if (this.OutRoll) {
            this.ZoomOut();
        }
    }

    MouseWheel(e: MouseWheelEvent): void {

        // disabling this for now, is just annoying - experiment in future with it having a sensitivity threshold and zooming just one level per gesture

        /*var delta = 0;

        if (e.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
            delta = e.wheelDelta;
        } else if (e.detail !== undefined) { // Firefox
            delta = -e.detail;
        }

        if (delta > 0) {
            this.ZoomIn();
        } else if (delta < 0) {
            this.ZoomOut();
        }*/
    }

    HitTests(point): void {
        var units = App.Unit;
        var zin = this._InPos;
        var zout = this._OutPos;
        var area = (30*units);

        this.InRoll = Dimensions.hitRect(zin.x - (area*0.5),zin.y - (area*0.5),area, area,point.x,point.y);
        this.OutRoll = Dimensions.hitRect(zout.x - (area*0.5),zout.y - (area*0.5),area, area,point.x,point.y);
    }

    ZoomIn(): void {
        if (this.CurrentSlot < this._ZoomSlots.length-1) {
            App.MainScene.OptionsPanel.Close(); // todo: use an event
            this.CurrentSlot +=1;
            this.StopAllTweens();
            this.ZoomAlpha = 1;
            this.DelayTo(App,this._ZoomSlots[this.CurrentSlot],500,0,"ZoomLevel");
            this.DelayTo(this,0,500,700,"ZoomAlpha");
        }
    }

    ZoomOut(): void {
        if (this.CurrentSlot > 0) {
            App.MainScene.OptionsPanel.Close(); // todo: use an event
            this.CurrentSlot -=1;
            this.StopAllTweens();
            this.ZoomAlpha = 1;
            this.DelayTo(App,this._ZoomSlots[this.CurrentSlot],500,0,"ZoomLevel");
            this.DelayTo(this,0,500,700,"ZoomAlpha");
        }
    }

    ZoomReset(display?:boolean) {
        display = display || false;
        this.CurrentSlot = 2;
        this.StopAllTweens();
        this.DelayTo(App,this._ZoomSlots[this.CurrentSlot],500,0,"ZoomLevel");
        if (display) {
            this.ZoomAlpha = 1;
            this.DelayTo(this,0,500,700,"ZoomAlpha");
        }
    }

    resize(): void {
        var units = App.Unit;
        this._InPos = new Point(30*units,App.Height - (30*units));
        this._OutPos = new Point(70*units,App.Height - (30*units));
    }
}
