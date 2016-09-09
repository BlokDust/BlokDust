import {IApp} from '../../IApp';
import {Option} from './Option';

declare var App: IApp;

export class OptionMeter  extends Option {

    public Level: number;
    public Peak: number;
    private _Zero: number;

    constructor(name) {
        super();

        this.Type = "meter";
        this.Name = name;

        this.Level = 0;
        this.Peak = 0;
        this._Zero = 0;

    }

    Draw(ctx,units,i,panel,yoveride?) {
        super.Draw(ctx,units,i,panel);
        var width = panel.Range;
        var height = 48*units;
        var x = panel.Margin;
        var y = yoveride || 0;
        var dataType = Math.round(units*10);
        this.Monitor(panel);


        // DIVIDERS //
        ctx.globalAlpha = 1;
        App.StrokeColor(ctx,App.Palette[1]);
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }
        //ctx.fillRect(x + this._Zero,y + (6*units),units,36*units);
        this.DiagonalFill(ctx,x + this._Zero,y + units,panel.Range - this._Zero,46*units,9);


        // TITLE //
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));

        // MARKER //
        var bodyType = units*5;
        ctx.font = "400 " + bodyType + "px PT Sans"; //TODO: convert to newer font system
        ctx.textAlign = "right";
        ctx.fillText("0dB", x + this._Zero - (5*units), y + (height * 0.5) + (2.5 * units));

        // BAR //
        var col = panel.SliderColours[i - (Math.floor(i/panel.SliderColours.length)*(panel.SliderColours.length))];
        App.FillColor(ctx,col);
        ctx.fillRect(x - units,y + (9*units),units + this.Level,30*units);

        // PEAK //
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.fillRect(x + this.Peak - (0.5*units),y + (9*units),units,30*units);
        ctx.beginPath();
        ctx.moveTo(x + this.Peak - (2 * units), y + (height * 0.5));
        ctx.lineTo(x + this.Peak, y + (height * 0.5) - (2 * units));
        ctx.lineTo(x + this.Peak + (2 * units), y + (height * 0.5));
        ctx.lineTo(x + this.Peak, y + (height * 0.5) + (2 * units));
        ctx.closePath();
        ctx.fill();

        //ctx.fillRect(x + this._Zero,y + (9*units),units,30*units);
    }

    Monitor(panel) {
        App.Audio.Monitor();

        var min = -50;
        var max = 10;

        this.Level = panel.linPosition(0,panel.Range,min,max,App.Audio.Level);
        this.Level = panel.ValueInRange(this.Level,0,panel.Range);
        this._Zero = panel.linPosition(0,panel.Range,min,max,0);

        if (this.Level > this.Peak) {
            this.Peak = this.Level;
        }

    }

    MonitorReset() {
        App.Audio.MonitorReset();
        this.Peak = 0;
    }



}