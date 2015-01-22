/**
 * Created by luketwyman on 16/01/2015.
 */
import App = require("./App");
import Option = require("./Option");
import Size = Fayde.Utils.Size;
import ParametersPanel = require("./ParametersPanel");

class ButtonSelect extends Option{


    constructor(position: Point, size: Size, value: number, name: string, setting: string) {
        super();

        this.Type = "buttons";
        this.Position = position;
        this.Size = size;
        this.Value = value;
        this.Name = name;
        this.Setting = setting;
    }

    Draw(ctx,units,i,panel) {

        var x = this.Position.x;
        var y = this.Position.y;
        var height = this.Size.Height;

        var dataType = Math.round(units*10);
        var headerType = Math.round(units*33);

        // DIVIDERS //
        ctx.fillStyle = ctx.strokeStyle = "#393d43";
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }

        // PARAM NAME //
        ctx.fillStyle = App.Palette[8];// WHITE
        ctx.font = "400 " + dataType + "px Dosis";
        ctx.textAlign = "right";
        ctx.fillText(this.Name.toUpperCase(), panel.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));

    }

}


export = ButtonSelect;