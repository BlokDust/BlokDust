/**
 * Created by luketwyman on 18/01/2015.
 */

import IOption = require("./IOption");
import Size = Fayde.Utils.Size;
import OptionHandle = require("./OptionHandle");

class Option implements IOption {

    public Type:String;
    public Position:Point;
    public Size:Size;
    public Name:string;
    public Setting:string;

    public Origin:number;
    public Selected:boolean;
    public Log:boolean;
    public Value:number;
    public Min:number;
    public Max:number;
    public Quantised:boolean;


    public EValue: number[];
    public EMin: number[];
    public EMax: number[];
    public EPerc: number[];

    public HandleRoll: boolean[];
    public Handles: OptionHandle[];

    constructor() {


    }

    Draw(ctx,units,i,panel) {

    }

    PlotGraph() {

    }
}

export = Option;