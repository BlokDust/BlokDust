/**
 * Created by luketwyman on 17/01/2015.
 */

/**
 * Created by luketwyman on 16/01/2015.
 */

import IOption = require("./IOption");
import Size = Fayde.Utils.Size;
import ParametersPanel = require("./ParametersPanel");

class ADSR implements IOption{

    public Type: String;
    public Position: Point;
    public Size: Size;
    public Selected: boolean;
    public Name: string;
    public A: number;
    public AMin: number;
    public AMax: number;
    public D: number;
    public DMin: number;
    public DMax: number;
    public S: number;
    public SMin: number;
    public SMax: number;
    public R: number;
    public RMin: number;
    public RMax: number;

    Setting: string;
    Value: number;
    Min: number;
    Max: number;
    Quantised: boolean;
    Origin: number;

    constructor(position: Point, size: Size, name: string, a: number, d: number, s: number, r: number) {
        this.Type = "buttons";
        this.Position = position;
        this.Size = size;
        this.Name = name;
    }



}


export = ADSR;