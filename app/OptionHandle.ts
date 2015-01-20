/**
 * Created by luketwyman on 19/01/2015.
 */


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

        this.Selected = false;

    }

}

export = OptionHandle;