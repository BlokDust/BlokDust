import {IApp} from '../../IApp';
import Point = etch.primitives.Point;

declare var App: IApp;

export class OptionSubHandle {

    public Position: Point;

    public Value: number;
    public Min: number;
    public Max: number;
    public RangeMin: number;
    public RangeMax: number;
    public Setting: string;

    public Selected: boolean;

    constructor(position: Point, val: number, min: number, max: number, rangemin: number, rangemax: number, setting: string) {

        this.Position = position;
        this.Value = val;
        this.Min = min;
        this.Max = max;
        this.RangeMin = rangemin;
        this.RangeMax = rangemax;
        this.Setting = setting;

        //this.Width = this.SetPos(val);

    }


    SetVal(pos){
        var scale = (this.Max - this.Min) / (this.RangeMax - this.RangeMin);
        return (pos - this.RangeMin) * scale + this.Min;
    }

    SetPos(value){
        var scale = (this.Max - this.Min) / (this.RangeMax - this.RangeMin);
        return this.RangeMin + (value - this.Min) / scale;
    }

    Draw(ctx,x,y,size,col) {

        var w = this.Position.x;
        //console.log(w);

        App.FillColor(ctx,col);
        ctx.beginPath();
        ctx.moveTo(x - w - size, y);
        ctx.lineTo(x - w, y - size);
        ctx.lineTo(x + w, y - size);
        ctx.lineTo(x + w + size, y);
        ctx.lineTo(x + w, y + size);
        ctx.lineTo(x - w, y + size);
        ctx.closePath();
        ctx.fill();

        App.FillColor(ctx,App.Palette[8]);
        ctx.beginPath();
        ctx.moveTo(x - w - size, y);
        ctx.lineTo(x - w, y - size);
        ctx.lineTo(x - w + (size * 0.5), y - (size * 0.5));
        ctx.lineTo(x - w - (size * 0.5), y + (size * 0.5));
        ctx.closePath();
        ctx.fill();

    }

}