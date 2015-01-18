/**
 * Created by luketwyman on 16/01/2015.
 */

import IOption = require("./IOption");
import Size = Fayde.Utils.Size;
import ParametersPanel = require("./ParametersPanel");

class ButtonSelect implements IOption{

    public Type: String;
    public Position: Point;
    public Size: Size;
    public Origin: number;
    public Selected: boolean;
    public Value: number;
    public Min: number;
    public Max: number;
    public Quantised: boolean;
    public Name: string;
    public Setting: string;

    constructor(position: Point, size: Size, value: number, name: string, setting: string) {
        this.Type = "buttons";
        this.Position = position;
        this.Size = size;
        this.Value = value;
        this.Name = name;
        this.Setting = setting;
    }



}


export = ButtonSelect;