/**
 * Created by luketwyman on 06/02/2015.
 */

import App = require("./../App");
import Option = require("./Option");
import Size = Fayde.Utils.Size;
import ParametersPanel = require("./ParametersPanel");
import OptionHandle = require("./OptionHandle");

class Parametric extends Option{

    public Handles: OptionHandle[];
    public Smoothness: number;
    public LineGain: number[];

    constructor(position: Point, size: Size, name: string, handle0, handle1, handle2, handle3) {
        super();

        this.Type = "parametric";
        this.Position = position;
        this.Size = size;
        this.Name = name;

        this.Handles = [];
        this.HandleRoll = [];

        this.Handles[0] = handle0;
        this.Handles[1] = handle1;
        this.Handles[2] = handle2;
        this.Handles[3] = handle3;

        this.Smoothness = 300;
        this.LineGain = [];
        for (var j=0; j<this.Smoothness; j++) {
            this.LineGain[j] = 0;
        }

        this.PlotGraph();
    }

    Draw(ctx,units,i,panel) {
        super.Draw(ctx, units, i, panel);

        var p = [this.Handles[0].Position,this.Handles[1].Position,this.Handles[2].Position,this.Handles[3].Position];

        var y = this.Position.y;
        var height = this.Size.Height;
        ctx.globalAlpha = 1;


        // MARKERS //
        ctx.strokeStyle = "#393d43";
        ctx.beginPath();
        ctx.moveTo(panel.Margin - units, y + (height*0.1)); // left
        ctx.lineTo(panel.Margin - units, y + (height*0.9));
        ctx.moveTo(panel.Range + panel.Margin + units, y + (height*0.1)); // right
        ctx.lineTo(panel.Range + panel.Margin + units, y + (height*0.9));
        ctx.moveTo(panel.Range + panel.Margin + units, Math.round(y + (height*0.5))); // horizontal
        ctx.lineTo(panel.Margin - units, Math.round(y + (height*0.5)));
        ctx.stroke();




        // LINE //
        ctx.lineWidth = 2;
        ctx.strokeStyle = App.Palette[8];
        var ly = y + (height*0.5);

        ctx.beginPath();
        ctx.moveTo(panel.Margin, ly - (this.LineGain[0]));
        for (var j=0; j<this.Smoothness; j++) {
            ctx.lineTo(panel.Margin + ((panel.Range/this.Smoothness)*(j+1)), ly  - (this.LineGain[j]));
        }
        ctx.stroke();
        ctx.lineWidth = 1;


        // HANDLES //
        for (var j=0; j<4; j++) {
            this.Handles[j].Draw(ctx,panel.Margin + p[j].x,y + (height*0.9) - p[j].y,height * 0.06,App.Palette[3+j]);
        }

    }

    PlotGraph() {
        super.PlotGraph();

        var p = [];
        for (var j=0; j<4; j++) {
            var x = Math.floor((this.Smoothness/this.Size.Width) * this.Handles[j].Position.x);
            var y = this.Handles[j].Position.y - (this.Size.Height*0.4);
            p[j] = new Point(x,y);
        }

        var Gain1 = this.CurvePass(1,p[0].x,30,p[0].y);
        var Gain2 = this.CurvePass(2,p[1].x,20,p[1].y);
        var Gain3 = this.CurvePass(3,p[2].x,80,p[2].y);
        var Gain4 = this.CurvePass(4,p[3].x,30,p[3].y);

        // ADD //
        for (var j=0; j<this.Smoothness; j++) {
            this.LineGain[j] = Gain1[j] + Gain2[j] + Gain3[j] + Gain4[j];

            if (this.LineGain[j]>(this.Size.Height*0.4)) {
                this.LineGain[j] = (this.Size.Height*0.4);
            }
            if (this.LineGain[j]< -(this.Size.Height*0.4)) {
                this.LineGain[j] = -(this.Size.Height*0.4);
            }

        }

    }

    CurvePass(n: number,freq: number,q: number,gain: number) {

        var tempGain = [];
        for (var j=0; j<this.Smoothness; j++) {
            tempGain[j] = 0;
        }
        //RAMP UP //
        if (n>1) {
            for (var h=0; h<q; h++) {
                tempGain[h + (freq - q)] = this.Quadratic(h,0,gain*0.4,q);
            }
            for (var h=0; h<(q*0.6); h++) {
                tempGain[h + (freq - (q*0.6))] += this.Sinusoidal(h,0,gain*0.6,q*0.6);
            }
        } else {
            for (var h=0; h<freq; h++) {
                tempGain[h] = gain;
            }
        }

        // PEAK
        tempGain[freq] = gain;

        //RAMP DOWN //
        if (n<4) {
            for (var h=0; h<q; h++) {
                tempGain[(freq + q) - h] = this.Quadratic(h,0,gain*0.4,q);
            }
            for (var h=0; h<(q*0.6); h++) {
                tempGain[(freq + (q*0.6)) - h] += this.Sinusoidal(h,0,gain*0.6,q*0.6);
            }
        } else {
            for (var h=(freq+1); h<this.Smoothness; h++) {
                tempGain[h] = gain;
            }
        }

        return tempGain;
    }

    Quadratic(t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2*t*t + b;
        t--;
        return -c/2 * (t*(t-2) - 1) + b;
    }

    Sinusoidal(t, b, c, d) {
        return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
    }

}

export = Parametric;