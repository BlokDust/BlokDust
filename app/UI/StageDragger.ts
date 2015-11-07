import DisplayObject = etch.drawing.DisplayObject;
import {IApp} from '../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = minerva.Point;

declare var App: IApp;

export class StageDragger extends DisplayObject {

    private _DragStart: Point;
    private _OffsetStart: Point;
    private _Dragging: boolean = false;
    public Tweens: any[];
    public Destination: Point;

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this.Tweens = [];
        this.Destination = new Point(App.DragOffset.x,App.DragOffset.y);
    }

    //-------------------------------------------------------------------------------------------
    //  LOOPS
    //-------------------------------------------------------------------------------------------


    Update() {

        if ( Math.round(App.DragOffset.x)!==Math.round(this.Destination.x) || Math.round(App.DragOffset.y)!==Math.round(this.Destination.y) ) {
            var speed = App.Config.ScrollEasing;
            App.DragOffset.x += (((this.Destination.x - App.DragOffset.x)/100) * speed);
            App.DragOffset.y += (((this.Destination.y - App.DragOffset.y)/100) * speed);

            App.Metrics.UpdateGridScale();
        }
    }

    Draw() {
        if (this._Dragging && ((App.DragOffset.x!==this._OffsetStart.x) || (App.DragOffset.y!==this._OffsetStart.y))) {
            var cx = App.Metrics.C.x;
            var cy = App.Metrics.C.y;
            var units = App.Unit;
            var ctx = App.MainScene.Ctx;

            ctx.strokeStyle = App.Palette[App.ThemeManager.Txt]; // White
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - (5*units),cy);
            ctx.lineTo(cx + (5*units),cy);
            ctx.moveTo(cx,cy - (5*units));
            ctx.lineTo(cx,cy + (5*units));
            ctx.stroke();
        }
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v){

        var me = this;
        var offsetTween = new TWEEN.Tween({x: panel[""+v].x, y: panel[""+v].y});
        offsetTween.to({x: destination.x, y: destination.y}, t);
        offsetTween.onUpdate(function () {
            panel[""+v].x = this.x;
            panel[""+v].y = this.y;
            me.Destination.x = this.x;
            me.Destination.y = this.y;
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


    MouseDown(point: Point) {
        this._DragStart = new Point(point.x,point.y);
        this._OffsetStart = new Point(App.DragOffset.x,App.DragOffset.y);
        this._Dragging = true;
        console.log(App.DragOffset);
    }

    MouseMove(point: Point) {
        if (this._Dragging) {
            this.Drag(point);
        }
    }

    MouseUp() {
        this._Dragging = false;
    }

    Drag(point: Point) {
        var speed = App.Config.ScrollSpeed;
        /*App.DragOffset.x = this._OffsetStart.x + (((point.x - this._DragStart.x)*(speed/App.ZoomLevel)));
        App.DragOffset.y = this._OffsetStart.y + (((point.y - this._DragStart.y)*(speed/App.ZoomLevel)));
        App.Metrics.UpdateGridScale();*/

        //this.StopAllTweens();
        this.Destination.x = this._OffsetStart.x + (((point.x - this._DragStart.x)*(speed/App.ZoomLevel)));
        this.Destination.y = this._OffsetStart.y + (((point.y - this._DragStart.y)*(speed/App.ZoomLevel)));
        //console.log(this.Destination);
    }

    Jump(point: Point, to: Point) {
        this.StopAllTweens();
        var x = (-point.x * App.GridSize) + ((to.x - App.Metrics.C.x)/App.ZoomLevel);
        var y = (-point.y * App.GridSize) + ((to.y - App.Metrics.C.y)/App.ZoomLevel);
        this.DelayTo(App,new Point(x,y),400,0,"DragOffset");
        //this.Destination = new Point(x,y);
        App.MainScene.ToolTipClose();
    }

}
