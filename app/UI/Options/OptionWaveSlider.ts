/**
 * Created by luketwyman on 23/02/2015.
 */

import Option = require("./Option");
import WaveForm = require("./OptionWave");
import Size = minerva.Size;
import ParametersPanel = require("./../OptionsPanel");

class WaveSlider extends WaveForm{

    public Spread: number;


    constructor(position: Point, size: Size, origin: number, value: number, min: number, max: number, quantised: boolean, name: string, setting: string, log: boolean, waveform: number[], spread: number) {
        super(waveform);

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
        var dataType = Math.round(units*10);
        var headerType = Math.round(units*33);

        if (!this.Waveform.length) {
            ctx.textAlign = "center";
            ctx.fillStyle = App.Palette[8];// WHITE
            ctx.font = App.Metrics.TxtItalic;
            //ctx.fillText("LOADING SAMPLE", (panel.Range*0.5) + panel.Margin, y + (height * 0.5) + (19*units));
            App.AnimationsLayer.DrawSprite('loading',(panel.Range*0.5) + panel.Margin, y + (height * 0.5),11,true);
        }

         else {

            // LINES //
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1;
            ctx.fillStyle = ctx.strokeStyle = App.Palette[8];// WHITE

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

            ctx.fillStyle = App.Palette[8];// WHITE
            ctx.beginPath();
            ctx.moveTo(x + panel.Margin - dragWidth, y + (height * 0.5));
            ctx.lineTo(x + panel.Margin, y + (height * 0.5) - dragWidth);
            ctx.lineTo(x + panel.Margin + (dragWidth * 0.5), y + (height * 0.5) - (dragWidth * 0.5));
            ctx.lineTo(x + panel.Margin - (dragWidth * 0.5), y + (height * 0.5) + (dragWidth * 0.5));
            ctx.closePath();
            ctx.fill();


            // VALUE TOOLTIP //
            if (this.Selected) {
                ctx.textAlign = "left";
                ctx.font = App.Metrics.TxtSlider;
                var string = panel.NumberWithCommas("" + (Math.round(this.Value * 100) / 100));
                ctx.fillText(string, rightSpread + (25 * units), y + (height * 0.5) + (headerType * 0.35));
            }
        }
    }


}


export = WaveSlider;