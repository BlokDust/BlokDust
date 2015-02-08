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

    private _Gain1: number[];
    private _Gain2: number[];
    private _Gain3: number[];
    private _Gain4: number[];


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
        var ly = Math.round(y + (height*0.5));



        // MARKERS //
        //ctx.globalAlpha = 1;
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
        //ctx.strokeStyle = App.Palette[8];

        // COLOURS //
        //ctx.globalAlpha = 0.2;
        /*for (var j=1; j<5; j++) {
            //ctx.fillStyle = App.Palette[5];
            //ctx.strokeStyle = App.Palette[5];

            ctx.beginPath();
            ctx.moveTo(panel.Margin, ly - (this["_Gain"+j][0]));

            for (var h=0; h<this.Smoothness; h++) {
                ctx.lineTo(panel.Margin + ((panel.Range/this.Smoothness)*(h+1)), ly  - (this["_Gain"+j][h]));
            }
            ctx.stroke();
            *//*ctx.lineTo(panel.Margin + panel.Range, Math.floor(ly));
             ctx.lineTo(panel.Margin, Math.floor(ly));
             ctx.closePath();
             ctx.fill();*//*
        }*/




        ctx.globalAlpha = 1;
        ctx.strokeStyle = App.Palette[8];
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
            var x = Math.round((this.Smoothness/this.Size.Width) * this.Handles[j].Position.x)-1;
            var y = this.Handles[j].Position.y - (this.Size.Height*0.4);
            p[j] = new Point(x,y);
        }

        var q1 = 20;
        var q2 = 1;
        var q1a = (this.Smoothness/37.5) * (21-q1);
        var q2a = (this.Smoothness/37.5) * (21-q2);

        this._Gain1 = this.CurvePass("lowshelf",p[0].x,30,p[0].y);
        this._Gain2 = this.CurvePass("peaking",p[1].x,q1a,p[1].y);
        this._Gain3 = this.CurvePass("peaking",p[2].x,q2a,p[2].y);
        this._Gain4 = this.CurvePass("highshelf",p[3].x,30,p[3].y);

        // ADD //
        for (var j=0; j<this.Smoothness; j++) {
            this.LineGain[j] = this._Gain1[j] + this._Gain2[j] + this._Gain3[j] + this._Gain4[j];

            // CAP RANGE //
            if (this.LineGain[j]>(this.Size.Height*0.4)) {
                this.LineGain[j] = (this.Size.Height*0.4);
            }
            if (this.LineGain[j]< -(this.Size.Height*0.4)) {
                this.LineGain[j] = -(this.Size.Height*0.4);
            }

        }

    }

    CurvePass(type: string,freq: number,q: number,gain: number) {

        var tempGain = [];
        // BELL CURVE //
        for (var h=0; h<(this.Smoothness); h++) {
            tempGain[h + (freq)] = this.Bell(h,0,gain,q);
        }
        for (var h=0; h<(this.Smoothness); h++) {
            tempGain[(freq) - h] = this.Bell(h,0,gain,q);
        }
        // PEAK
        tempGain[freq] = gain;


        // SHELVES //
        if (type=="lowshelf") {
            for (var h=0; h<freq; h++) {
                tempGain[h] = gain;
            }
        }
        if (type=="highshelf") {
            for (var h=(freq+1); h<this.Smoothness; h++) {
                tempGain[h] = gain;
            }
        }

        return tempGain;
    }


    Bell(t, b, c, d) {
        return c * Math.exp( -(t*t) / Math.pow((d*0.5),2) ) + b;
    }

}

export = Parametric;