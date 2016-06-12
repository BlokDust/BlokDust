import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import IDisplayContext = etch.drawing.IDisplayContext;
import {IApp} from '../IApp';
import {MainScene} from './../MainScene';

declare var App: IApp;

export class TrashCan extends DisplayObject {

    private _RollOver: boolean;

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);

        this._RollOver = false;
    }

    draw() {
        var units = App.Unit;
        var ctx = this.ctx;
        var tx = (<MainScene>this.drawTo).width - (30*units);
        var ty = (<MainScene>this.drawTo).height - (30*units);
        var s = 1;
        if (this._RollOver && (<MainScene>this.drawTo).IsDraggingABlock) {
            s = 1.2;
        }

        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - ((11*s)*units), ty - ((11*s)*units)); // tl
        ctx.lineTo(tx + ((11*s)*units), ty - ((11*s)*units)); // tr
        ctx.lineTo(tx + ((8*s)*units), ty + ((11*s)*units)); // br
        ctx.lineTo(tx - ((8*s)*units), ty + ((11*s)*units)); // bl
        ctx.closePath();
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - ((4*s)*units), ty - ((4*s)*units));
        ctx.lineTo(tx + ((4*s)*units), ty + ((4*s)*units));
        ctx.moveTo(tx + ((4*s)*units), ty - ((4*s)*units));
        ctx.lineTo(tx - ((4*s)*units), ty + ((4*s)*units));
        ctx.stroke();

        ctx.lineWidth = 1;

    }

    MouseMove(point) {
        var units = App.Unit;
        this._RollOver = Dimensions.hitRect((<MainScene>this.drawTo).width - (60*units),(<MainScene>this.drawTo).height - (60*units),(60*units), (60*units), point.x, point.y);
    }

    MouseUp() {
        if (this._RollOver) {
            (<MainScene>this.drawTo).DeleteSelectedBlock();
            return true;
        }
        return false;
    }

}
