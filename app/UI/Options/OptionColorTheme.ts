import {IApp} from '../../IApp';
import {Option} from './Option';

declare var App: IApp;

export class ThemeSelector  extends Option {

    public HandleRoll: boolean[];

    constructor(name) {
        super();

        this.Type = "themeSelector";
        this.Name = name;
        this.HandleRoll = [];

    }

    Draw(ctx,units,i,panel,yoveride?) {
        super.Draw(ctx,units,i,panel);
        var width = panel.Range;
        var height = 60*units;
        var x = panel.Margin;
        var y = yoveride || 0;
        var dataType = Math.round(units*10);

        // DIVIDERS //
        ctx.globalAlpha = 1;
        App.StrokeColor(ctx,App.Palette[1]);
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }


        // TITLE //
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(App.ThemeManager.CurrentTheme.Name, x + (width*0.5) - (15*units), y + (height*0.5) + (6*units));


        // PARAM NAME //
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));


        // ARROWS //
        ctx.beginPath();
        ctx.moveTo(x + (20 * units), y + (height*0.5) - (20*units));
        ctx.lineTo(x, y + (height*0.5));
        ctx.lineTo(x + (20 * units), y + (height*0.5) + (20*units));

        ctx.moveTo(x + width - (20 * units), y + (height*0.5) - (20*units));
        ctx.lineTo(x + width, y + (height*0.5));
        ctx.lineTo(x + width - (20 * units), y + (height*0.5) + (20*units));
        ctx.stroke();


        var grd = App.GridSize * 0.5;
        var dx = x + (width*0.5);
        var dy = y + (height*0.5) - (grd*0.5);

        var startX = 3;


        App.FillColor(ctx,App.Palette[0]);
        this.DrawDiamond(ctx,dx + (grd*(startX)),dy);
        App.FillColor(ctx,App.Palette[1]);
        this.DrawDiamond(ctx,dx + (grd*(startX+1)),dy + grd);
        App.FillColor(ctx,App.Palette[3]);
        this.DrawDiamond(ctx,dx + (grd*(startX+2)),dy);
        App.FillColor(ctx,App.Palette[4]);
        this.DrawDiamond(ctx,dx + (grd*(startX+3)),dy + grd);
        App.FillColor(ctx,App.Palette[5]);
        this.DrawDiamond(ctx,dx + (grd*(startX+4)),dy);
        App.FillColor(ctx,App.Palette[6]);
        this.DrawDiamond(ctx,dx + (grd*(startX+5)),dy + grd);
        App.FillColor(ctx,App.Palette[7]);
        this.DrawDiamond(ctx,dx + (grd*(startX+6)),dy);
        App.FillColor(ctx,App.Palette[8]);
        this.DrawDiamond(ctx,dx + (grd*(startX+7)),dy + grd);
        App.FillColor(ctx,App.Palette[9]);
        this.DrawDiamond(ctx,dx + (grd*(startX+8)),dy);
        App.FillColor(ctx,App.Palette[10]);
        this.DrawDiamond(ctx,dx + (grd*(startX+9)),dy + grd);
        App.FillColor(ctx,App.Palette[14]);
        this.DrawDiamond(ctx,dx + (grd*(startX+10)),dy);


        App.StrokeColor(ctx,App.Palette[1]);
        ctx.beginPath();
        ctx.moveTo(x + (width*0.5), y + (5*units));
        ctx.lineTo(x + (width*0.5), y + height - (5*units));
        ctx.stroke();
    }

    DrawDiamond(ctx,x,y) {
        var grd = App.GridSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y - grd);
        ctx.lineTo(x - grd, y);
        ctx.lineTo(x, y + grd);
        ctx.lineTo(x + grd, y);
        ctx.closePath();
        ctx.fill();
    }

}