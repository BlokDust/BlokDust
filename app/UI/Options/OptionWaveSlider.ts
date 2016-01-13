import Size = minerva.Size;
import {IApp} from '../../IApp';
import {OptionsPanel as ParametersPanel} from './../OptionsPanel';
import {Option} from './Option';
import Point = etch.primitives.Point;
import {WaveForm} from './OptionWave';

declare var App: IApp;

export class WaveSlider extends WaveForm {

    public Spread: number;

    constructor(position: Point, size: Size, origin: number, value: number, min: number, max: number, quantised: boolean, name: string, setting: string, log: boolean, waveform: number[], spread: number, emptystring?: string) {
        super(waveform,emptystring);

        this.Type = "waveslider";
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
        //this._Waveform = waveform;
        this.Spread = spread;
    }


    Draw(ctx,units,i,panel) {
        super.Draw(ctx,units,i,panel);

        var x = this.Position.x;
        var y = this.Position.y;
        var height = this.Size.height;
        var origin = this.Origin;
        var headerType = Math.round(units*33);

        if (this.Waveform.length) {

            // LINES //
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1;
            ctx.fillStyle = ctx.strokeStyle = App.Palette[App.ThemeManager.Txt].toString();// WHITE

            var spread = (panel.Range / (this.Max - this.Min)) * this.Spread;

            var leftSpread = x + panel.Margin - (spread * 0.5);
            if (leftSpread < panel.Margin) {
                leftSpread = panel.Margin;
            }
            var rightSpread = x + panel.Margin + (spread * 0.5);
            if (rightSpread > (panel.Margin + panel.Range)) {
                rightSpread = panel.Margin + panel.Range;
            }
            ctx.beginPath();
            ctx.moveTo(leftSpread, y);
            ctx.lineTo(leftSpread, y + height);
            ctx.moveTo(rightSpread, y);
            ctx.lineTo(rightSpread, y + height);
            ctx.stroke();
            ctx.lineWidth = 1;


            // SLIDEBAR //
            var col = panel.SliderColours[i - (Math.floor(i / panel.SliderColours.length) * (panel.SliderColours.length))];
            var offset = 0;
            if (origin == panel.Margin) {
                offset = -units;
            }

            ctx.globalAlpha = 1;
            ctx.fillStyle = ctx.strokeStyle = col;
            ctx.fillRect(x + panel.Margin - (units), y, 2 * units, height);


            // GRAB TRIANGLES //
            var dragWidth = (height) * 0.2;
            ctx.beginPath();
            ctx.moveTo(x + panel.Margin - dragWidth, y + (height * 0.5));
            ctx.lineTo(x + panel.Margin, y + (height * 0.5) - dragWidth);
            ctx.lineTo(x + panel.Margin + dragWidth, y + (height * 0.5));
            ctx.lineTo(x + panel.Margin, y + (height * 0.5) + dragWidth);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = App.Palette[8].toString();// WHITE
            ctx.beginPath();
            ctx.moveTo(x + panel.Margin - dragWidth, y + (height * 0.5));
            ctx.lineTo(x + panel.Margin, y + (height * 0.5) - dragWidth);
            ctx.lineTo(x + panel.Margin + (dragWidth * 0.5), y + (height * 0.5) - (dragWidth * 0.5));
            ctx.lineTo(x + panel.Margin - (dragWidth * 0.5), y + (height * 0.5) + (dragWidth * 0.5));
            ctx.closePath();
            ctx.fill();


            // VALUE TOOLTIP //
            ctx.fillStyle = App.Palette[App.ThemeManager.Txt].toString();// WHITE
            if (this.Selected) {
                ctx.textAlign = "left";
                ctx.font = App.Metrics.TxtSlider;
                var string = panel.NumberWithCommas("" + (Math.round(this.Value * 100) / 100));
                ctx.fillText(string, rightSpread + (25 * units), y + (height * 0.5) + (headerType * 0.35));
            }
        }
    }
}
