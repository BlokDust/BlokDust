import {IApp} from '../../IApp';
import {Option} from './Option';
import {OptionsPanel as ParametersPanel} from './../OptionsPanel';
import Size = minerva.Size; //TODO: es6 modules

declare var App: IApp;

export class ButtonArray extends Option {

    constructor(position: Point, size: Size, name: string, setting: string, buttons: any, mode: string) {
        super();

        this.Type = "buttons";
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.Setting = setting;
        this.Buttons = buttons;
        this.ButtonMode = mode;

        this.HandleRoll = [];
    }

    Draw(ctx,units,i,panel) {

        var x = this.Position.x;
        var y = this.Position.y;
        var height = this.Size.height;

        var midType = Math.round(units*10);

        // DIVIDERS //
        ctx.fillStyle = ctx.strokeStyle = App.Palette[1];
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }

        /*var dsize = (3*units);
        ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height*0.5) - dsize);
        ctx.lineTo(panel.Margin - dsize, y + (height*0.5));
        ctx.lineTo(panel.Margin, y + (height*0.5) + dsize);
        ctx.lineTo(panel.Margin + dsize, y + (height*0.5));
        ctx.closePath();
        ctx.fill();*/

        for (var j=0; j<this.Buttons.length; j++) {
            if (j>0) {
                ctx.fillStyle = ctx.strokeStyle = App.Palette[1];
                var bx = panel.Margin + this.Buttons[j].Position.x;
                ctx.beginPath();
                ctx.moveTo(Math.round(x + bx), y + (height*0.15));
                ctx.lineTo(Math.round(x + bx), y + (height*0.85));
                ctx.closePath();
                ctx.stroke();
            }

            this.Buttons[j].Draw(ctx,panel,units,panel.Margin,height,i,this.ButtonMode);
        }

        // PARAM NAME //
        ctx.fillStyle = App.Palette[App.Color.Txt];// WHITE
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (midType * 0.4));

    }

}