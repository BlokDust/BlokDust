/**
 * Created by luketwyman on 19/01/2015.
 */
import App = require("./../../App");

class OptionHandle {

    public Position: Point;

    public XValue: number;
    public XMin: number;
    public XMax: number;
    public XRange: number;

    public YValue: number;
    public YMin: number;
    public YMax: number;
    public YRange: number;

    public Selected: boolean;

    public XSetting: string;
    public YSetting: string;

    public Log: boolean;
    public XLog: boolean;
    public YLog: boolean;

    constructor(position: Point, xval: number, xmin: number, xmax: number, xrange: number, yval: number, ymin: number, ymax: number, yrange: number, xsetting: string, ysetting: string) {

        this.Position = position;

        this.XValue = xval;
        this.XMin = xmin;
        this.XMax = xmax;
        this.XRange = xrange;
        this.XSetting = xsetting;

        this.YValue = yval;
        this.YMin = ymin;
        this.YMax = ymax;
        this.YRange = yrange;
        this.YSetting = ysetting || "";

        this.Log = false;
        this.XLog = false;
        this.YLog = false;
        this.Selected = false;

    }

    Draw(ctx,x,y,size,col) {


        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = App.Palette[8];
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x, y - size);
        ctx.lineTo(x + (size * 0.5), y - (size * 0.5));
        ctx.lineTo(x - (size * 0.5), y + (size * 0.5));
        ctx.closePath();
        ctx.fill();

    }

}

export = OptionHandle;