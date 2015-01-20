/**
 * Created by luketwyman on 11/01/2015.
 */
import Option = require("./Option");
import Size = Fayde.Utils.Size;
import ParametersPanel = require("./ParametersPanel");

class Slider extends Option{


    constructor(position: Point, size: Size, origin: number, selected: boolean, value: number, min: number, max: number, quantised: boolean, name: string, setting: string) {
        super();

        this.Type = "slider";
        this.Position = position;
        this.Size = size;
        this.Origin = origin;
        this.Selected = selected;
        this.Value = value;
        this.Min = min;
        this.Max = max;
        this.Quantised = quantised;
        this.Name = name;
        this.Setting = setting;
    }


}


export = Slider;