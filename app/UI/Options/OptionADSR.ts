import Size = minerva.Size;
import {IApp} from '../../IApp';
import {OptionHandle} from './OptionHandle';
import {OptionsPanel as ParametersPanel} from './../OptionsPanel';
import {Option} from './Option';
import Point = etch.primitives.Point;

declare var App: IApp;

export class ADSR extends Option {

    private _Node:any[];

    public Handles: OptionHandle[];


    constructor(position: Point, size: Size, name: string, handle0, handle1, handle2) {
        super();

        this.Type = "ADSR";
        this.Position = position;
        this.Size = size;
        this.Name = name;

        this.Handles = [];

        this._Node = [];
        this.EValue = [];
        this.EMin = [];
        this.EMax = [];
        this.EPerc = [];

        this.HandleRoll = [];

        this.Handles[0] = handle0;
        this.Handles[1] = handle1;
        this.Handles[2] = handle2;

    }

    Draw(ctx,units,i,panel) {
        super.Draw(ctx,units,i,panel);

        var a = this.Handles[0].Position.x;
        var d = this.Handles[1].Position.x;
        var s = this.Handles[1].Position.y;
        var r = this.Handles[2].Position.x;
        var y = this.Position.y;
        var height = this.Size.height;

        ctx.globalAlpha = 1;
        var vert = 0.6;


        // MARKERS //
        App.StrokeColor(ctx,App.Palette[1]);
        ctx.beginPath();
        ctx.moveTo(panel.Margin - units, y + (height*0.1));
        ctx.lineTo(panel.Margin - units, y + (height*0.9));

        ctx.moveTo((panel.Range*vert) + panel.Margin + units, y + (height*0.1));
        ctx.lineTo((panel.Range*vert) + panel.Margin + units, y + (height*0.9));

        ctx.moveTo(panel.Range + panel.Margin + units, y + (height*0.1));
        ctx.lineTo(panel.Range + panel.Margin + units, y + (height*0.9));
        ctx.stroke();


        // DIAGONALS //

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height*0.9));
        ctx.lineTo(panel.Margin + a, y + (height*0.1)); // ATTACK
        ctx.lineTo(panel.Margin + a + d, y + (height*0.9) - s); // DECAY
        ctx.lineTo(panel.Margin + (panel.Range*vert), y + (height*0.9) - s); // SUSTAIN
        ctx.lineTo(panel.Margin + (panel.Range*vert) + r, y + (height*0.9)); // RELEASE
        ctx.lineTo(panel.Range + panel.Margin + units, y + (height*0.9));
        ctx.closePath();
        ctx.clip();
        panel.diagonalFill(panel.Margin - units, y + units, panel.Range + (2 * units), height - (2 * units), 9);
        ctx.restore();


        // LINE //
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height*0.9));
        ctx.lineTo(panel.Margin + a, y + (height*0.1)); // ATTACK
        ctx.lineTo(panel.Margin + a + d, y + (height*0.9) - s); // DECAY
        ctx.lineTo(panel.Margin + (panel.Range*vert), y + (height*0.9) - s); // SUSTAIN
        ctx.lineTo(panel.Margin + (panel.Range*vert) + r, y + (height*0.9)); // RELEASE
        ctx.lineTo(panel.Range + panel.Margin + units, y + (height*0.9));
        ctx.stroke();
        ctx.lineWidth = 1;

        // GRAB DIAMONDS //
        var dragWidth = height * 0.06;

        App.FillColor(ctx,App.Palette[3]);
        ctx.beginPath();
        ctx.moveTo(a + panel.Margin - dragWidth, y + (height * 0.1));
        ctx.lineTo(a + panel.Margin, y + (height * 0.1) - dragWidth);
        ctx.lineTo(a + panel.Margin + dragWidth, y + (height * 0.1));
        ctx.lineTo(a + panel.Margin, y + (height * 0.1) + dragWidth);
        ctx.closePath();
        ctx.fill();

        App.FillColor(ctx,App.Palette[4]);
        ctx.beginPath();
        ctx.moveTo(a + d + panel.Margin - dragWidth, y + (height * 0.9) - s);
        ctx.lineTo(a + d + panel.Margin, y + (height * 0.9) - dragWidth - s);
        ctx.lineTo(a + d + panel.Margin + dragWidth, y + (height * 0.9) - s);
        ctx.lineTo(a + d + panel.Margin, y + (height * 0.9) + dragWidth - s);
        ctx.closePath();
        ctx.fill();

        App.FillColor(ctx,App.Palette[5]);
        ctx.beginPath();
        ctx.moveTo((panel.Range*vert) + r + panel.Margin - dragWidth, y + (height * 0.9));
        ctx.lineTo((panel.Range*vert) + r + panel.Margin, y + (height * 0.9) - dragWidth);
        ctx.lineTo((panel.Range*vert) + r + panel.Margin + dragWidth, y + (height * 0.9));
        ctx.lineTo((panel.Range*vert) + r + panel.Margin, y + (height * 0.9) + dragWidth);
        ctx.closePath();
        ctx.fill();

        App.FillColor(ctx,App.Palette[8]);
        ctx.beginPath();
        ctx.moveTo(a + panel.Margin - dragWidth, y + (height * 0.1));
        ctx.lineTo(a + panel.Margin, y + (height * 0.1) - dragWidth);
        ctx.lineTo(a + panel.Margin + (dragWidth * 0.5), y + (height * 0.1) - (dragWidth * 0.5));
        ctx.lineTo(a + panel.Margin - (dragWidth * 0.5), y + (height * 0.1) + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(a + d + panel.Margin - dragWidth, y + (height * 0.9) - s);
        ctx.lineTo(a + d + panel.Margin, y + (height * 0.9) - dragWidth - s);
        ctx.lineTo(a + d + panel.Margin + (dragWidth * 0.5), y + (height * 0.9) - s - (dragWidth * 0.5));
        ctx.lineTo(a + d + panel.Margin - (dragWidth * 0.5), y + (height * 0.9) - s + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo((panel.Range*vert) + r + panel.Margin - dragWidth, y + (height * 0.9));
        ctx.lineTo((panel.Range*vert) + r + panel.Margin, y + (height * 0.9) - dragWidth);
        ctx.lineTo((panel.Range*vert) + r + panel.Margin + (dragWidth * 0.5), y + (height * 0.9) - (dragWidth * 0.5));
        ctx.lineTo((panel.Range*vert) + r + panel.Margin - (dragWidth * 0.5), y + (height * 0.9) + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();
    }



}