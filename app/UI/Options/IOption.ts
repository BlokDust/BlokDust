/**
 * Created by luketwyman on 16/01/2015.
 */
import Size = Fayde.Utils.Size;
import OptionHandle = require("./OptionHandle");
import OptionSubHandle = require("./OptionSubHandle");

interface IOption {
    Type: String;
    Position: Point;
    Size: Size;
    Name: string;
    Setting: string;


    Origin: number;
    Selected: boolean;
    Log: boolean;
    Value: number;
    Min: number;
    Max: number;
    Quantised: boolean;

    EValue: number[];
    EMin: number[];
    EMax: number[];
    EPerc: any[];

    HandleRoll: any[];
    SubHandleRoll: any[];
    Handles: OptionHandle[];
    SubHandles: OptionSubHandle[];

    ButtonStyle: number;
    ButtonNo: number;

    Spread: number;

    Track: string;
    User: string;


    Draw(ctx,units,i,panel): void;

}

export = IOption;