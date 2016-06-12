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

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);

        this._Pulse = 0;
        this._Polarity = 1;
    }


    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------


    update() {
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


    draw() {
        var ctx = this.ctx;
        var units = App.Unit;

        this.ctx.globalAlpha = 1;
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
                this.ctx.lineWidth = 2;
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