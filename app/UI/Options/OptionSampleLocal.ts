import Size = minerva.Size;
import {IApp} from '../../IApp';
import {Option} from './Option';
import Point = etch.primitives.Point;

declare var App: IApp;

export class OptionSampleLocal  extends Option {

    constructor(position: Point, size: Size, name: string, track: string, setting: string) {
        super();

        this.Type = "samplelocal";
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.Track = track;
        this.Setting = setting;
        this.HandleRoll = [];

        if (!this.Permalink) {
            this.Permalink = '';
        }
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
        ctx.moveTo(panel.Margin + (panel.Range*0.65), y + (height*0.2));
        ctx.lineTo(panel.Margin + (panel.Range*0.65), y + (height* 0.8));
        ctx.stroke();



        // PARAM NAME //
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));


        ctx.lineWidth = 2;
        ctx.textAlign = "center";
        var ix = panel.Margin + (panel.Range*0.575);
        var iy = y + (height * 0.5);
        var diamond = 7;

        // TRACK //
        ctx.font = App.Metrics.TxtItalic;
        ctx.textAlign = "left";
        ctx.fillText(this.Track, panel.Margin, y + (height * 0.5) + (dataType*0.35));


        // LOAD NEW //
        ctx.textAlign = "center";
        /*ctx.fillText("upload sample ", panel.Margin + (panel.Range*0.82), y + (height * 0.5) + (dataType*0.35));
        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.lineWidth = 2;
        ix = panel.Margin + panel.Range - (diamond*units);
        iy = y + (height * 0.5);
        ctx.beginPath();
        ctx.moveTo(ix, iy - (diamond*units));
        ctx.lineTo(ix + (diamond*units), iy);
        ctx.lineTo(ix, iy + (diamond*units));
        ctx.stroke();*/

        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(panel.Margin + (panel.Range*0.65), y + (height*0.25));
        ctx.lineTo(panel.Margin + (panel.Range*0.65), y + (height* 0.75));

        ctx.lineTo(panel.Margin + (panel.Range), y + (height*0.75));
        ctx.lineTo(panel.Margin + (panel.Range), y + (height* 0.25));
        ctx.closePath();
        ctx.stroke();

        ctx.font = App.Metrics.TxtMid;
        ctx.fillText("UPLOAD SAMPLE", panel.Margin + (panel.Range*0.82), y + (height * 0.5) + (dataType*0.35));



        ctx.lineWidth = 1;
    }

}
