/**
 * Created by luketwyman on 23/02/2015.
 */

import Option = require("./Option");
import Size = Fayde.Utils.Size;
import App = require("./../App");
import ParametersPanel = require("./ParametersPanel");

class WaveSlider extends Option{

    private _Waveform: number[];
    public Spread: number;


    constructor(position: Point, size: Size, origin: number, value: number, min: number, max: number, quantised: boolean, name: string, setting: string, log: boolean, waveform: number[], spread: number) {
        super();

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
        this._Waveform = waveform;
        this.Spread = spread;
    }


    Draw(ctx,units,i,panel) {
        super.Draw(ctx,units,i,panel);

        var x = this.Position.x;
        var y = this.Position.y;
        var height = this.Size.Height;
        var origin = this.Origin;
        var dataType = Math.round(units*10);
        var headerType = Math.round(units*33);

        // DIVIDERS //
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = App.Palette[1];// Grey
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }


        var col = panel.SliderColours[(i) - (Math.floor((i)/panel.SliderColours.length)*(panel.SliderColours.length))];
        ctx.fillStyle = App.Palette[1];// WHITE
        ctx.fillStyle = col;
        // WAVEFORM //
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height * 0.5)); // left mid
        if (this._Waveform.length!==0) {
            for (var j=0; j<this._Waveform.length; j++) {
                ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) - (this._Waveform[j] * (height * 0.4)));
            }
            ctx.lineTo(panel.Range + panel.Margin, y + (height * 0.5)); // right mid
            for (var j=this._Waveform.length-1; j>-1; j--) {
                ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) + (this._Waveform[j] * (height * 0.4)));
            }
        }
        ctx.closePath();
        ctx.clip();

        ctx.globalAlpha = 0.05;
        ctx.fillStyle = ctx.strokeStyle = "#282b31";
        ctx.fillStyle = App.Palette[1];// WHITE
        ctx.fillRect(panel.Margin,y,panel.Range,height);
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        panel.vertFill(panel.Margin - units, y + units, panel.Range + (2 * units), height - (2 * units), 5);
        ctx.lineWidth = 1;


        /*ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height * 0.5)); // left mid
        if (this._Waveform.length!==0) {
            for (var j=0; j<this._Waveform.length; j++) {
                ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) - (this._Waveform[j] * (height * 0.4)));
            }
            ctx.lineTo(panel.Range + panel.Margin, y + (height * 0.5)); // right mid
            for (var j=this._Waveform.length-1; j>-1; j--) {
                ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) + (this._Waveform[j] * (height * 0.4)));
            }
        }
        ctx.closePath();
        ctx.stroke();*/


        ctx.restore();



        ctx.save();
        var spread = (panel.Range / (this.Max-this.Min)) * this.Spread;
        ctx.fillStyle = App.Palette[1];// WHITE
        ctx.beginPath();
        ctx.moveTo(x + panel.Margin - (spread*0.5), y);
        ctx.lineTo(x + panel.Margin + (spread*0.5), y);
        ctx.lineTo(x + panel.Margin + (spread*0.5), y + height);
        ctx.lineTo(x + panel.Margin - (spread*0.5), y + height);
        ctx.closePath();
        ctx.clip();

        ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height * 0.5)); // left mid
        if (this._Waveform.length!==0) {
            for (var j=0; j<this._Waveform.length; j++) {
                ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) - (this._Waveform[j] * (height * 0.4)));
            }
            ctx.lineTo(panel.Range + panel.Margin, y + (height * 0.5)); // right mid
            for (var j=this._Waveform.length-1; j>-1; j--) {
                ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) + (this._Waveform[j] * (height * 0.4)));
            }
        }
        ctx.closePath();
        ctx.fill();


        ctx.restore();






        /*ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height * 0.5)); // left mid
        if (this._Waveform.length!==0) {
            for (var j=0; j<this._Waveform.length; j++) {
                ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) - (this._Waveform[j] * (height * 0.4)));
            }
            ctx.lineTo(panel.Range + panel.Margin, y + (height * 0.5)); // right mid
        }
        ctx.fill();*/



        ctx.save();
        ctx.beginPath();
        ctx.moveTo(panel.Margin, y);
        ctx.lineTo(panel.Margin + panel.Range, y);
        ctx.lineTo(panel.Margin + panel.Range, y + height);
        ctx.lineTo(panel.Margin, y + height);
        ctx.closePath();
        ctx.clip();

        ctx.strokeStyle = App.Palette[8];// WHITE
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = App.Palette[8];// WHITE
        ctx.beginPath();
        ctx.moveTo(x + panel.Margin - (spread*0.5),y);
        ctx.lineTo(x + panel.Margin - (spread*0.5),y + height);
        ctx.moveTo(x + panel.Margin + (spread*0.5),y);
        ctx.lineTo(x + panel.Margin + (spread*0.5),y + height);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.restore();


        var col = panel.SliderColours[i - (Math.floor(i/panel.SliderColours.length)*(panel.SliderColours.length))];

        var offset = 0;
        if (origin == panel.Margin) {
            offset = -units;
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = col;
        //ctx.fillStyle = ctx.strokeStyle = App.Palette[5];// WHITE
        //ctx.fillStyle = App.Palette[8];// WHITE
        ctx.fillRect(x + panel.Margin - (units), y, 2 * units, height);


        // GRAB TRIANGLES //
        var dragWidth = (height*0.666) * 0.2;


        ctx.beginPath();
        ctx.moveTo(x + panel.Margin - dragWidth, y + (height * 0.5));
        ctx.lineTo(x + panel.Margin, y + (height * 0.5) - dragWidth);
        ctx.lineTo(x + panel.Margin + dragWidth, y + (height * 0.5));
        ctx.lineTo(x + panel.Margin, y + (height * 0.5) + dragWidth);
        ctx.closePath();
        ctx.fill();

        /*ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x + panel.Margin - dragWidth, y + (height * 0.5));
        ctx.lineTo(x + panel.Margin, y + (height * 0.5) - dragWidth);
        ctx.lineTo(x + panel.Margin + dragWidth, y + (height * 0.5));
        ctx.lineTo(x + panel.Margin, y + (height * 0.5) + dragWidth);
        ctx.closePath();
        ctx.fill();*/



        ctx.fillStyle = App.Palette[8];// WHITE
        ctx.beginPath();
        ctx.moveTo(x + panel.Margin - dragWidth, y + (height * 0.5));
        ctx.lineTo(x + panel.Margin, y + (height * 0.5) - dragWidth);
        ctx.lineTo(x + panel.Margin + (dragWidth * 0.5), y + (height * 0.5) - (dragWidth * 0.5));
        ctx.lineTo(x + panel.Margin - (dragWidth * 0.5), y + (height * 0.5) + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();


        // PARAM NAME //
        ctx.fillStyle = App.Palette[8];// WHITE
        ctx.font = panel.Sketch.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));


        // VALUE TOOLTIP //
        if (this.Selected) {
            ctx.textAlign = "left";
            ctx.font = panel.Sketch.TxtSlider;
            var string = panel.NumberWithCommas("" + (Math.round(this.Value * 100) / 100));
            ctx.fillText(string, x + panel.Margin + (25 * units), y + (height * 0.5) + (headerType * 0.35));
        }
    }


}


export = WaveSlider;