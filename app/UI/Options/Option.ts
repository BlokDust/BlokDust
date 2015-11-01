import Size = minerva.Size;
import {IOption} from './IOption';
import {OptionButton} from './OptionButton';
import {OptionHandle} from './OptionHandle';
import {OptionSubHandle} from './OptionSubHandle';
import {OptionSwitch} from './OptionSwitch';
import Point = etch.primitives.Point;

export class Option implements IOption {

    public Type: String;
    public Position: Point;
    public Size: Size;
    public Name: string;
    public Setting: string;
    public DisplayConversion: any;

    public Origin: number;
    public Selected: boolean;
    public Log: boolean;
    public Value: number;
    public Min: number;
    public Max: number;
    public Quantised: boolean;


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