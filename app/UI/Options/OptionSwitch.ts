/**
 * Created by luketwyman on 06/07/2015.
 */

import Option = require("./Option");
import Size = minerva.Size;
import ParametersPanel = require("./../OptionsPanel");

class OptionSwitch {

    public Position: Point;
    public Name:string;
    public Setting:string;
    public Selected: boolean;
    public Size: Size;

    constructor(position: Point, name, setting, value, size) {

        this.Position = position;
        this.Name = name;
        this.Setting = setting;
        this.Selected = value;
        this.Size = size;

        console.log(this.Selected);
    }

    Draw(ctx,panel,units,x,h,i) {

        var col = panel.SliderColours[i - (Math.floor(i/panel.SliderColours.length)*(panel.SliderColours.length))];
        var size = 0;
        x += this.Position.x;
        var y = this.Position.y;
        var w = this.Size.width;
        //h = this.Size.Height;

        ctx.fillStyle = App.Palette[1];// WHITE
        ctx.fillRect(x,y + (h*0.16),w,h*0.43);

        ctx.fillStyle = col;
        if (this.Selected) {
            ctx.fillRect(x + (w*0.5),y + (h*0.16),w*0.5,h*0.42);
        } else {
            ctx.fillRect(x, y + (h*0.16),w*0.5,h*0.42);
        }


        // PARAM NAME //
        ctx.fillStyle = App.Palette[8];// WHITE
        ctx.font = panel.Sketch.TxtMid;
        ctx.textAlign = "center";
        ctx.fillText(this.Name.toUpperCase(), x + (w*0.5), y + (h*0.84));


    }

}

export = OptionSwitch;