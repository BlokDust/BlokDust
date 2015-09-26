import Size = minerva.Size;
import {DisplayObject} from '../DisplayObject';
import {Grid} from './../Grid';
import {IApp} from '../IApp';
import {IBlock} from './../Blocks/IBlock';
import {MainScene} from './../MainScene';
import {ISketchContext} from '../ISketchContext';

declare var App: IApp;

export class ToolTip extends DisplayObject {

    public Alpha: number;
    public Name: string;
    public Open: boolean;
    public Position: Point;
    private _AlphaTween: TWEEN.Tween;

    Init(sketch: ISketchContext): void {
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

        var units = App.Unit;
        var ctx = this.Ctx;
        var dataType = Math.round(units*10);
        var thisAlpha = this.Alpha/100;

        ctx.font = App.Metrics.TxtMid;
        var thisWidth = ctx.measureText(this.Name.toUpperCase()).width + (40*units);
        var x = this.Position.x;
        var y = this.Position.y;

        // BG //
        ctx.globalAlpha = thisAlpha*0.9;
        ctx.fillStyle = App.Palette[2];// Black

        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x + thisWidth,y);
        ctx.lineTo(x + thisWidth,y + (20*units));
        ctx.lineTo(x + (20*units),y + (20*units));
        ctx.closePath();
        ctx.fill();

        // NAME //
        ctx.globalAlpha = thisAlpha;
        ctx.fillStyle = App.Palette[App.Color.Txt]; // WHITE
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
        TWEEN.remove(this._AlphaTween);
        this._AlphaTween = new TWEEN.Tween({x: this.Alpha});
        this._AlphaTween.to({x: destination}, t);
        this._AlphaTween.onUpdate(function () {
            panel.Alpha = this.x;
        });
        this._AlphaTween.easing(TWEEN.Easing.Quintic.InOut);
        this._AlphaTween.start(this.LastVisualTick);
    }

    StopTween() {
        TWEEN.remove(this._AlphaTween);
    }

}
