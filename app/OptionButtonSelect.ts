/**
 * Created by luketwyman on 16/01/2015.
 */

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


}


export = ButtonSelect;