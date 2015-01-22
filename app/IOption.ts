/**
 * Created by luketwyman on 16/01/2015.
 */
import Size = Fayde.Utils.Size;
import OptionHandle = require("./OptionHandle");

interface IOption {
    Type: String;
    Position: Point;
    Size: Size;
    Name: string;
    Setting: string;


    Origin: number;
    Selected: boolean;
    Value: number;
    Min: number;
    Max: number;
    Quantised: boolean;

    EValue: number[];
    EMin: number[];
    EMax: number[];
    EPerc: any[];

    HandleRoll: any[];
    Handles: OptionHandle[];

    Draw(ctx,units,i,panel): void;

}

export = IOption;