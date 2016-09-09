import {IApp} from '../../IApp';
import Size = etch.primitives.Size;
import Point = etch.primitives.Point;

declare var App: IApp;

export class OptionSwitch {

    public Position: Point;
    public Name:string;
    public Setting:string;
    public Selected: boolean;
    public Size: Size;
    private _Lit: boolean;
    public Mode: string;

    constructor(position: Point, name, setting, value, size, lit, mode) {

        this.Position = position;
        this.Name = name;
        this.Setting = setting;
        this.Selected = value;
        this.Size = size;
        this._Lit = lit;
        this.Mode = mode;

    }

    Draw(ctx,panel,units,x,h,i) {

        var style = 1;

        var col = panel.SliderColours[i - (Math.floor(i/panel.SliderColours.length)*(panel.SliderColours.length))];
        x += this.Position.x;
        var y = this.Position.y;
        var w = this.Size.width;
        var mode = this.Mode;



        if (style==0) {
            App.FillColor(ctx,App.Palette[1]);
            ctx.fillRect(x,y + (h*0.16),w,h*0.43);
            App.FillColor(ctx,col);

            if (this.Selected) {
                if (this._Lit) {
                    App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
                }
                ctx.fillRect(x + (w*0.5),y + (h*0.16),w*0.5,h*0.42);
            } else {
                ctx.fillRect(x, y + (h*0.16),w*0.5,h*0.42);
            }
        }

        else if (style==1) {

            App.StrokeColor(ctx,App.Palette[1]);
            ctx.beginPath();
            ctx.moveTo(Math.round(x + (w*0.5)), y + (h*0.15));
            ctx.lineTo(Math.round(x + (w*0.5)), y + (h*0.55));
            ctx.closePath();
            ctx.stroke();




            if (this.Selected) {
                //panel.diagonalFill(x, y + (h*0.15), w * 0.5, h * 0.4,9);
                App.FillColor(ctx,col);
                //ctx.fillRect(x + (w*0.65), y + (h*0.55), w * 0.2, h * 0.05);
                //ctx.fillRect(x + (w*0.65), y + (h*0.1), w * 0.2, h * 0.05);
                ctx.fillRect(x + (w*0.5), y + (h*0.55), w * 0.5, h * 0.05);
                //ctx.fillRect(x + (w*0.5), y + (h*0.15), w * 0.5, h * 0.4);
            } else {
                //panel.diagonalFill(x + (w*0.5), y + (h*0.15), w * 0.5, h * 0.4,9);
                App.FillColor(ctx,col);
                //ctx.fillRect(x + (w*0.15), y + (h*0.55), w * 0.2, h * 0.05);
                //ctx.fillRect(x + (w*0.15), y + (h*0.1), w * 0.2, h * 0.05);
                ctx.fillRect(x, y + (h*0.55), w * 0.5, h * 0.05);
                //ctx.fillRect(x, y + (h*0.15), w * 0.5, h * 0.4);
            }

            ctx.lineWidth = 2;
            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            var cx = x + (w*0.5);
            var cy = y + (h * 0.35);
            var lx = x + (w*0.25);
            var rx = x + (w*0.75);

            ctx.beginPath();

            switch(mode) {

                case "fewMany":
                    ctx.moveTo(lx - (5*units), cy - (5*units));
                    ctx.lineTo(lx + (5*units), cy + (5*units));

                    ctx.moveTo(rx - (10*units), cy - (5*units));
                    ctx.lineTo(rx, cy + (5*units));
                    ctx.moveTo(rx - (5*units), cy - (5*units));
                    ctx.lineTo(rx + (5*units), cy + (5*units));
                    ctx.moveTo(rx, cy - (5*units));
                    ctx.lineTo(rx + (10*units), cy + (5*units));

                    break;

                case "offOn":
                    ctx.moveTo(lx - (5*units), cy);
                    ctx.lineTo(lx + (5*units), cy);

                    /*ctx.moveTo(cx + (15*units), cy - (5*units));
                    ctx.lineTo(cx + (5*units), cy - (5*units));
                    ctx.lineTo(cx + (5*units), cy + (5*units));
                    ctx.lineTo(cx + (15*units), cy + (5*units));
                    ctx.moveTo(cx + (10*units), cy);
                    ctx.lineTo(cx + (17.5*units), cy);*/

                    ctx.moveTo(rx + (5*units), cy);
                    ctx.lineTo(rx, cy - (5*units));
                    ctx.lineTo(rx - (5*units), cy);
                    ctx.lineTo(rx, cy + (5*units));
                    ctx.lineTo(rx + (5*units), cy);

                    break;

                case "eitherOr":

                    break;

            }
            ctx.stroke();
            ctx.lineWidth = 1;
        }


        // PARAM NAME //
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "center";
        ctx.fillText(this.Name.toUpperCase(), x + (w*0.5), y + (h*0.84));


    }

}