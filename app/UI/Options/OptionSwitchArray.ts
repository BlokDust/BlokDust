/**
 * Created by luketwyman on 16/01/2015.
 */

import Option = require("./Option");
import Size = minerva.Size;
import ParametersPanel = require("./../OptionsPanel");

class SwitchArray extends Option{


    constructor(position: Point, size: Size, switches: any) {
        super();

        this.Type = "switches";
        this.Position = position;
        this.Size = size;
        this.Switches = switches;

        this.HandleRoll = [];
    }

    Draw(ctx,units,i,panel) {

        var x = this.Position.x;
        var y = this.Position.y;
        var height = this.Size.height;


        // DIVIDERS //
        ctx.fillStyle = ctx.strokeStyle = App.Palette[1];
        if (i !== (panel.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(panel.Margin - units, y + height);
            ctx.lineTo(panel.Range + panel.Margin + units, y + height);
            ctx.stroke();
        }

        for (var j=0; j<this.Switches.length; j++) {
            this.Switches[j].Draw(ctx,panel,units,panel.Margin,this.Size.height,i);
        }


    }

}


export = SwitchArray;
