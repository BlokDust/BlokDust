/**
 * Created by luketwyman on 23/02/2015.
 */

import Option = require("./Option");
import Size = minerva.Size;
import ParametersPanel = require("./../OptionsPanel");

class WaveForm extends Option{


    constructor (waveform,emptystring?) {
        super();
        this.Waveform = waveform;
        this.EmptyString = emptystring || "";
    }

    
    Draw(ctx,units,i,panel) {
        super.Draw(ctx,units,i,panel);

        var x = this.Position.x;
        var y = this.Position.y;
        var height = this.Size.height;
        var dataType = Math.round(units*10);

        // DIVIDERS //
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = App.Palette[1];// Grey
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }

        if (!this.Waveform.length) {
            ctx.fillStyle = App.Palette[App.Color.Txt];// WHITE
            if (this.EmptyString.length>1) {
                ctx.textAlign = "center";
                ctx.font = App.Metrics.TxtMid;
                ctx.fillText(this.EmptyString.toUpperCase(), (panel.Range*0.5) + panel.Margin, y + (height * 0.5) + (dataType * 0.4));
            } else {
                App.AnimationsLayer.DrawSprite('loading',(panel.Range*0.5) + panel.Margin, y + (height * 0.5),11,true);
            }


        }

        if (this.Handles && this.Waveform.length && this.Mode) {
            ctx.strokeStyle = App.Palette[1];
            panel.diagonalFill(panel.Margin + this.Handles[2].Position.x,y,this.Handles[3].Position.x - this.Handles[2].Position.x,height,9);
        }


        ctx.fillStyle = App.Palette[1];// WHITE

        // WAVEFORM //

        /*ctx.save();
         ctx.beginPath();
         ctx.moveTo(panel.Margin, y + (height * 0.5)); // left mid
         if (this._Waveform.length!==0) {
         for (var j=0; j<this._Waveform.length; j++) {
         ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) - (this._Waveform[j] * (height * 0.5)));
         //ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + ((height * 0.49) * this._Waveform[j]) );
         }
         ctx.lineTo(panel.Range + panel.Margin, y + (height * 0.5)); // right mid
         for (var j=this._Waveform.length-1; j>-1; j--) {
         ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + (height * 0.5) + (this._Waveform[j] * (height * 0.5)));
         //ctx.lineTo( ((panel.Range/this._Waveform.length)*j) + panel.Margin, y + ((height * 0.49) * this._Waveform[j]) );
         }
         }
         ctx.closePath();
         ctx.clip();

         ctx.globalAlpha = 0.05;
         ctx.fillStyle = ctx.strokeStyle = "#282b31";
         //ctx.fillStyle = App.Palette[1];// WHITE
         //ctx.fillRect(panel.Margin,y,panel.Range,height);
         ctx.globalAlpha = 1;
         ctx.lineWidth = 1;
         panel.vertFill(panel.Margin - units, y + units, panel.Range + (2 * units), height - (2 * units), 5);
         ctx.lineWidth = 1;

         ctx.fillRect(panel.Margin - units,y + units, panel.Range + (2 * units), height - (2 * units));
         ctx.restore();*/


        // FILL //

        ctx.fillStyle = App.Palette[1];// WHITE
        ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height * 0.5)); // left mid
        if (this.Waveform.length!==0) {
            for (var j=0; j<this.Waveform.length; j++) {
                ctx.lineTo( ((panel.Range/this.Waveform.length)*j) + panel.Margin, y + (height * 0.5) - (this.Waveform[j] * (height * 0.45)));
            }
            ctx.lineTo(panel.Range + panel.Margin, y + (height * 0.5)); // right mid
            for (var j=this.Waveform.length-1; j>-1; j--) {
                ctx.lineTo( ((panel.Range/this.Waveform.length)*j) + panel.Margin, y + (height * 0.5) + (this.Waveform[j] * (height * 0.45)));
            }
        }
        ctx.closePath();
        ctx.fill();


        // PARAM NAME //
        ctx.fillStyle = App.Palette[App.Color.Txt];// WHITE
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));


    }


}


export = WaveForm;
