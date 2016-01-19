import Size = minerva.Size;
import {OptionButton} from './OptionButton';
import {OptionHandle} from './OptionHandle';
import {OptionSubHandle} from './OptionSubHandle';
import {OptionSwitch} from './OptionSwitch';
import Point = etch.primitives.Point;

export interface IOption {
    Type: String;
    Position: Point;
    Size: Size;
    Name: string;
    Setting: string;
    DisplayConversion: any;

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

    Spread: number;

    Track: string;
    User: string;
    Permalink: string;

    Waveform: number[];
    Mode: boolean;
    EmptyString: string;

    Switches: OptionSwitch[];
    Buttons: OptionButton[];

    ButtonMode: string;

    Draw(ctx,units,i,panel): void;

}