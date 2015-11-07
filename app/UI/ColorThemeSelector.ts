import {IApp} from '../IApp';

declare var App: IApp;

export class ThemeSelector {

    public HandleRoll: boolean[];

    constructor() {

        this.HandleRoll = [];

    }

    Draw(ctx,x,y,width,height,units) {

        ctx.fillStyle = ctx.strokeStyle = App.Palette[App.ThemeManager.Txt];
        ctx.globalAlpha = 1;

        // TITLE //
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(App.ThemeManager.CurrentTheme.Name, x + (width*0.5) - (15*units), y + (height*0.5) + (6*units));


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


        ctx.fillStyle = App.Palette[0];
        this.DrawDiamond(ctx,dx + (grd*(startX)),dy);
        ctx.fillStyle = App.Palette[1];
        this.DrawDiamond(ctx,dx + (grd*(startX+1)),dy + grd);

        ctx.fillStyle = App.Palette[3];
        this.DrawDiamond(ctx,dx + (grd*(startX+2)),dy);
        ctx.fillStyle = App.Palette[4];
        this.DrawDiamond(ctx,dx + (grd*(startX+3)),dy + grd);
        ctx.fillStyle = App.Palette[5];
        this.DrawDiamond(ctx,dx + (grd*(startX+4)),dy);
        ctx.fillStyle = App.Palette[6];
        this.DrawDiamond(ctx,dx + (grd*(startX+5)),dy + grd);
        ctx.fillStyle = App.Palette[7];
        this.DrawDiamond(ctx,dx + (grd*(startX+6)),dy);
        ctx.fillStyle = App.Palette[8];
        this.DrawDiamond(ctx,dx + (grd*(startX+7)),dy + grd);
        ctx.fillStyle = App.Palette[9];
        this.DrawDiamond(ctx,dx + (grd*(startX+8)),dy);
        ctx.fillStyle = App.Palette[10];
        this.DrawDiamond(ctx,dx + (grd*(startX+9)),dy + grd);
        ctx.fillStyle = App.Palette[14];
        this.DrawDiamond(ctx,dx + (grd*(startX+10)),dy);


        ctx.strokeStyle = App.Palette[1];
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