/**
 * Created by luketwyman on 11/01/2015.
 */

import Size = Fayde.Utils.Size;
import ParametersPanel = require("./ParametersPanel");

class Slider {

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

    constructor(position: Point, size: Size, origin: number, selected: boolean, value: number, min: number, max: number, quantised: boolean, name: string, setting: string) {
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