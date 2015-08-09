/**
 * Created by luketwyman on 18/01/2015.
 */

import IOption = require("./IOption");
import OptionHandle = require("./OptionHandle");
import OptionSubHandle = require("./OptionSubHandle");
import OptionSwitch = require("./OptionSwitch");
import OptionButton = require("./OptionButton");
import Size = minerva.Size;

class Option implements IOption {

    public Type:String;
    public Position:Point;
    public Size:Size;
    public Name:string;
    public Setting:string;
    public DisplayConversion: any;

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
    public SubHandleRoll: boolean[];
    public SubHandles: OptionSubHandle[];


    public Spread: number;

    public Track: string;
    public User: string;

    public Waveform: number[];
    public Mode: boolean;
    public EmptyString: string;

    public Switches: OptionSwitch[];
    public Buttons: OptionButton[];

    public ButtonMode: string;

    constructor() {


    }

    Draw(ctx,units,i,panel) {

    }

    PlotGraph() {

    }
}

export = Option;