import Size = minerva.Size;
import {IApp} from '../../IApp';
import {Option} from './Option';
import Point = etch.primitives.Point;

declare var App: IApp;

export class Slider extends Option {

    constructor(position: Point, size: Size, origin: number, value: number, min: number, max: number, quantised: boolean, name: string, setting: string, log: boolean) {
        super();

        this.Type = "slider";
        this.Position = position;
        this.Size = size;
        this.Origin = origin;
        this.Value = value;
        this.Min = min;
        this.Max = max;
        this.Quantised = quantised;
        this.Name = name;
        this.Setting = setting;
        this.Log = log;
        this.Selected = false;
    }


    Draw(ctx,units,i,panel,yoveride?) {
        super.Draw(ctx,units,i,panel);

        var x = this.Position.x;
        var y = this.Position.y;
        if (yoveride) {
            y = yoveride;
        }
        var height = this.Size.height;
        var origin = this.Origin;
        var dataType = Math.round(units*10);
        var headerType = Math.round(units*33);

        // DIVIDERS //
        ctx.globalAlpha = 1;
        App.FillColor(ctx,App.Palette[1]);
        App.StrokeColor(ctx,App.Palette[1]);
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }


        // MID POINT //
        ctx.beginPath();
        ctx.moveTo((panel.Range * 0.5) + panel.Margin - (2 * units), y + (height * 0.5));
        ctx.lineTo((panel.Range * 0.5) + panel.Margin, y + (height * 0.5) - (2 * units));
        ctx.lineTo((panel.Range * 0.5) + panel.Margin + (2 * units), y + (height * 0.5));
        ctx.lineTo((panel.Range * 0.5) + panel.Margin, y + (height * 0.5) + (2 * units));
        ctx.closePath();
        ctx.fill();


        // BAR //
        if (origin !== panel.Margin) {
            panel.diagonalFill(panel.Margin - units, y + units, panel.Range + (2 * units), height - (2 * units), 9);
        }
        var offset = 0;
        if (origin == panel.Margin) {
            offset = -units;
        }
        ctx.globalAlpha = 1;
        var col = panel.SliderColours[i - (Math.floor(i/panel.SliderColours.length)*(panel.SliderColours.length))];
        App.FillColor(ctx,col);
        ctx.beginPath();
        ctx.moveTo(origin + offset, y);
        ctx.lineTo(x + panel.Margin, y);
        ctx.lineTo(x + panel.Margin, y + height);
        ctx.lineTo(origin + offset, y + height);
        ctx.closePath();
        ctx.fill();


        // LINE //
        ctx.fillRect(x + panel.Margin - (units), y, 2 * units, height);


        // GRAB TRIANGLES //
        var dragWidth = height * 0.2;
        ctx.beginPath();
        ctx.moveTo(x + panel.Margin - dragWidth, y + (height * 0.5));
        ctx.lineTo(x + panel.Margin, y + (height * 0.5) - dragWidth);
        ctx.lineTo(x + panel.Margin + dragWidth, y + (height * 0.5));
        ctx.lineTo(x + panel.Margin, y + (height * 0.5) + dragWidth);
        ctx.closePath();
        ctx.fill();

        App.FillColor(ctx,App.Palette[8]);
        ctx.beginPath();
        ctx.moveTo(x + panel.Margin - dragWidth, y + (height * 0.5));
        ctx.lineTo(x + panel.Margin, y + (height * 0.5) - dragWidth);
        ctx.lineTo(x + panel.Margin + (dragWidth * 0.5), y + (height * 0.5) - (dragWidth * 0.5));
        ctx.lineTo(x + panel.Margin - (dragWidth * 0.5), y + (height * 0.5) + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();

        // PARAM NAME //
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));


        // VALUE TOOLTIP //
        if (this.Selected) {
            ctx.textAlign = "left";
            ctx.font = App.Metrics.TxtSlider;
            var string = "";
            if (this.DisplayConversion) {
                string = "" + this.DisplayConversion(this.Value);
            } else {
                string = panel.NumberWithCommas("" + (Math.round(this.Value * 100) / 100));
            }
            ctx.fillText(string, x + panel.Margin + (25 * units), y + (height * 0.5) + (headerType * 0.35));
        }
    }
}