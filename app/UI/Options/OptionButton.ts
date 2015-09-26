import {IApp} from '../../IApp';
import {Option} from './Option';
import {OptionsPanel as ParametersPanel} from './../OptionsPanel';
import Size = minerva.Size;

declare var App: IApp;

export class OptionButton {

    public Position: Point;
    public Name: string;
    public Value: number;
    public Selected: boolean;
    public Size: Size;

    constructor(position: Point, name, selected, value, size) {

        this.Position = position;
        this.Name = name;
        this.Value = value;
        this.Selected = selected;
        this.Size = size;

    }

    Draw(ctx,panel,units,x,h,i,mode) {

        var col = panel.SliderColours[i - (Math.floor(i/panel.SliderColours.length)*(panel.SliderColours.length))];

        x += this.Position.x;
        var y = this.Position.y;
        var w = this.Size.width;

        ctx.lineWidth = 2;
        ctx.strokeStyle = App.Palette[App.Color.Txt];// WHITE
        ctx.fillStyle = col;
        if (this.Selected) {
            //ctx.fillRect(x,y + (h*0.15),w,h*0.7);
            /*ctx.beginPath();
            ctx.moveTo(x + (w*0.5), y + (h*0.85) + (4*units));
            ctx.lineTo(x + (w*0.5) - (5*units), y + (h*0.85) - units);
            ctx.lineTo(x + (w*0.5), y + (h*0.85) - (6*units));
            ctx.lineTo(x + (w*0.5) + (5*units), y + (h*0.85) - units);
            ctx.closePath();
            ctx.fill();*/

            ctx.fillRect(x + (w*0.4), y + (h*0.8), w * 0.2, h * 0.05);
        } else {
            /*ctx.beginPath();
            ctx.moveTo(x, y + (h*0.15));
            ctx.lineTo(x + w, y + (h*0.15));
            ctx.lineTo(x + w, y + (h*0.85));
            ctx.lineTo(x, y + (h*0.85));
            ctx.closePath();
            ctx.stroke();*/

            if (this.Value > 0) {
                /*ctx.beginPath();
                ctx.moveTo(x, y + (h*0.15));
                ctx.lineTo(x, y + (h*0.85));
                ctx.closePath();
                ctx.stroke();*/
            }

        }


        // PARAM NAME //
        ctx.strokeStyle = ctx.fillStyle = App.Palette[App.Color.Txt];// WHITE

        if (mode=="string") {
            ctx.font = App.Metrics.TxtMid;
            ctx.textAlign = "center";
            ctx.fillText(this.Name.toUpperCase(), x + (w*0.5), y + (h * 0.5) + (units * 4));
        }

        else if (mode=="wave") {

            var cx = x + (w*0.5);
            var cy = y + (h * 0.5);
            ctx.beginPath();

            switch (this.Value) {

                case 0:
                    ctx.moveTo(cx - (10*units), cy - (5*units));
                    ctx.bezierCurveTo(cx + (2.5*units), cy - (5*units),cx - (2.5*units), cy + (5*units),cx + (10*units), cy + (5*units));
                    break;

                case 1:
                    ctx.moveTo(cx - (10*units), cy - (5*units));
                    ctx.lineTo(cx, cy - (5*units));
                    ctx.lineTo(cx, cy + (5*units));
                    ctx.lineTo(cx + (10*units), cy + (5*units));
                    break;

                case 2:
                    ctx.moveTo(cx - (15*units), cy + (5*units));
                    ctx.lineTo(cx - (5*units), cy - (5*units));
                    ctx.lineTo(cx + (5*units), cy + (5*units));
                    ctx.lineTo(cx + (15*units), cy - (5*units));
                    break;

                case 3:
                    ctx.moveTo(cx - (10*units), cy + (5*units));
                    ctx.lineTo(cx, cy - (5*units));
                    ctx.lineTo(cx, cy + (5*units));
                    ctx.lineTo(cx + (10*units), cy - (5*units));
                    ctx.lineTo(cx + (10*units), cy + (5*units));
                    break;


            }

            ctx.stroke();

        }



        ctx.lineWidth = 1;

    }

}