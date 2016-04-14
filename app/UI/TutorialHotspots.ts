import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import Size = minerva.Size;
import {IApp} from '../IApp';
import Point = minerva.Point;

declare var App: IApp;

export class TutorialHotspots extends DisplayObject{

    public Points: Point[] = [];
    private _Pulse: number;
    private _Polarity: number;

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this._Pulse = 0;
        this._Polarity = 1;
    }


    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------


    Update() {
        if (this.Points.length) {

            if (this._Polarity===1) {
                this._Pulse += 1;
                if (this._Pulse>100) {
                    this._Polarity = - this._Polarity;
                }
            } else {
                this._Pulse -= 1;
                if (this._Pulse<0) {
                    this._Polarity = - this._Polarity;
                }
            }
        }
    }


    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        var ctx = this.Ctx;
        var units = App.Unit;

        this.Ctx.globalAlpha = 1;
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);


        if (this.Points.length) {


            // FOR EACH HOTSPOT //
            for (var i=0; i<this.Points.length; i++) {
                var x = this.Points[i].x;
                var y = this.Points[i].y;


                // DOT //
                var size = 2;
                ctx.beginPath();
                ctx.moveTo(x, y - (size*units));
                ctx.lineTo(x - (size*units), y);
                ctx.lineTo(x, y + (size*units));
                ctx.lineTo(x + (size*units), y);
                ctx.closePath();
                ctx.fill();

                // LINE //
                this.Ctx.lineWidth = 2;
                var size = 4 + (this._Pulse*0.06) + (Math.random());
                ctx.beginPath();
                ctx.moveTo(x, y - (size*units));
                ctx.lineTo(x - (size*units), y);
                ctx.lineTo(x, y + (size*units));
                ctx.lineTo(x + (size*units), y);
                ctx.closePath();
                ctx.stroke();

            }

        }
    }
}