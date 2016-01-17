import Size = minerva.Size;
import {IApp} from '../../IApp';
import {OptionsPanel as ParametersPanel} from './../OptionsPanel';
import {Option} from './Option';
import Point = etch.primitives.Point;

declare var App: IApp;

export class OptionSample  extends Option {

    constructor(position: Point, size: Size, name: string, track: string, user: string, setting: string) {
        super();

        this.Type = "sample";
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.Track = track;
        this.User = user;
        this.Setting = setting;
        this.HandleRoll = [];
    }


    Draw(ctx,units,i,panel) {
        super.Draw(ctx, units, i, panel);

        var x = this.Position.x;
        var y = this.Position.y;
        var height = this.Size.height;
        var origin = this.Origin;
        var dataType = Math.round(units * 10);
        var headerType = Math.round(units * 33);

        // DIVIDERS //
        ctx.globalAlpha = 1;
        App.StrokeColor(ctx,App.Palette[1]);
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(panel.Margin + (panel.Range*0.5), y + (height*0.2));
        ctx.lineTo(panel.Margin + (panel.Range*0.5), y + (height* 0.8));

        ctx.moveTo(panel.Margin + (panel.Range*0.65), y + (height*0.2));
        ctx.lineTo(panel.Margin + (panel.Range*0.65), y + (height* 0.8));
        ctx.stroke();



        // PARAM NAME //
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));


        // INFO BUTTON //
        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.lineWidth = 1;
        ctx.textAlign = "center";
        var ix = panel.Margin + (panel.Range*0.575);
        var iy = y + (height * 0.5);
        var diamond = 11;
        ctx.beginPath();
        ctx.moveTo(ix - (diamond*units), iy);
        ctx.lineTo(ix, iy - (diamond*units));
        ctx.lineTo(ix + (diamond*units), iy);
        ctx.lineTo(ix, iy + (diamond*units));
        ctx.closePath();
        ctx.stroke();
        ctx.fillText("?",ix,iy + (dataType*0.38));


        // TRACK //
        ctx.font = App.Metrics.TxtItalic;
        ctx.textAlign = "left";
        ctx.fillText(this.Track, panel.Margin, y + (height * 0.5)-(2*units));
        ctx.fillText("By "+this.User, panel.Margin, y + (height * 0.5) + (dataType) - (2*units));


        // LOAD NEW //
        ctx.textAlign = "center";
        ctx.fillText("load new sample ", panel.Margin + (panel.Range*0.82), y + (height * 0.5) + (dataType*0.35));
        ctx.lineWidth = 2;
        ix = panel.Margin + panel.Range - (diamond*units);
        iy = y + (height * 0.5);
        ctx.beginPath();
        ctx.moveTo(ix, iy - (diamond*units));
        ctx.lineTo(ix + (diamond*units), iy);
        ctx.lineTo(ix, iy + (diamond*units));
        ctx.stroke();
        ctx.lineWidth = 1;
    }

}