import Size = minerva.Size;
import {IOption} from './IOption';
import {OptionButton} from './OptionButton';
import {OptionHandle} from './OptionHandle';
import {OptionSubHandle} from './OptionSubHandle';
import {OptionSwitch} from './OptionSwitch';
import Point = etch.primitives.Point;
import {IApp} from '../../IApp';
declare var App: IApp;

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
    public Permalink: string;

    public Waveform: number[];
    public Mode: boolean;
    public EmptyString: string;

    public Switches: OptionSwitch[];
    public Buttons: OptionButton[];

    public ButtonMode: string;
    public Function: any;

    constructor() {

    }

    Draw(ctx,units,i,panel,yoveride?) {

    }

    PlotGraph() {

    }

    MonitorReset() {

    }

    DiagonalFill(ctx,x,y,w,h,s) {
        var pr = App.Metrics.PixelRatio;
        s = s *pr;
        var lineNo = Math.round((w+h) / (s));
        var pos1 = new Point(0,0);
        var pos2 = new Point(0,0);
        ctx.beginPath();
        for (var j=0;j<lineNo;j++) {
            pos1.x = (s * 0.5) + (s * j);
            pos1.y = 0;
            pos2.x = pos1.x - h;
            pos2.y = h;
            if (pos2.x<0) {
                pos2.y = h + pos2.x;
                pos2.x = 0;
            }
            if (pos1.x>w) {
                pos1.y = (pos1.x-w);
                pos1.x = w;
            }
            ctx.moveTo(x + pos1.x, y + pos1.y);
            ctx.lineTo(x + pos2.x, y + pos2.y);
        }
        ctx.stroke();
    }
}