import Size = minerva.Size;
import {IApp} from '../../IApp';
import {OptionHandle} from './OptionHandle';
import {OptionsPanel} from './../OptionsPanel';
import {OptionSubHandle} from './OptionSubHandle';
import {Option} from './Option';
import {Point} from '../../Core/Primitives/Point';

declare var App: IApp;

export class Parametric extends Option {

    public Handles: OptionHandle[];
    public SubHandles: OptionSubHandle[];
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
        this.SubHandles = [];
        this.SubHandleRoll = [];


        this.Handles[0] = handle0;
        this.Handles[1] = handle1;
        this.Handles[2] = handle2;
        this.Handles[3] = handle3;

        this.Smoothness = 300;
        this.LineGain = [];
        for (var j=0; j<this.Smoothness; j++) {
            this.LineGain[j] = 0;
        }

        //this.PlotGraph();
    }



    Draw(ctx,units,i,panel) {
        super.Draw(ctx, units, i, panel);

        var p = [this.Handles[0].Position,this.Handles[1].Position,this.Handles[2].Position,this.Handles[3].Position];

        var y = this.Position.y;
        var height = this.Size.height;
        ctx.globalAlpha = 1;
        var ly = Math.round(y + (height*0.45));



        // MARKERS //
        //ctx.globalAlpha = 1;
        ctx.strokeStyle = App.Palette[1];// Grey
        ctx.beginPath();
        ctx.moveTo(panel.Margin - units, y + (height*0.1)); // left
        ctx.lineTo(panel.Margin - units, y + (height*0.8));
        ctx.moveTo(panel.Range + panel.Margin + units, y + (height*0.1)); // right
        ctx.lineTo(panel.Range + panel.Margin + units, y + (height*0.8));
        ctx.moveTo(panel.Range + panel.Margin + units, Math.round(y + (height*0.45))); // horizontal
        ctx.lineTo(panel.Margin - units, Math.round(y + (height*0.45)));
        ctx.stroke();


        // NUMBERS //

        var markers = [20,50,100,200,1000,2000,5000,10000,20000];
        var markerNames = ["20","50","100","200","1k","2k","5k","10k","20k"];
        ctx.textAlign = "center";
        var bodyType = units*5;
        ctx.font = "300 italic " + bodyType + "px Merriweather Sans";
        ctx.font = "400 " + bodyType + "px PT Sans"; //TODO: convert to newer font system
        ctx.fillStyle = App.Palette[App.Color.Txt];
        //ctx.fillStyle = "#393d43";

        for (var j=0; j<markers.length; j++) {

            ctx.globalAlpha = 1;
            var xPos = this.logPosition(0,panel.Range,20,20000,markers[j]);
            ctx.fillText(markerNames[j],panel.Margin + xPos,y + height);


            if (markers[j]==100 || markers[j]==1000) {
                ctx.strokeStyle = App.Palette[1];// Grey
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(Math.round(panel.Margin + xPos)+0.5, y + (height*0.1)); // vert
                ctx.lineTo(Math.round(panel.Margin + xPos)+0.5, y + (height*0.8));
                ctx.stroke();
            }
        }

        // COLOURS //
        /*ctx.globalAlpha = 0.35;
        for (var j=1; j<5; j++) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = App.Palette[2+j];

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

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height*0.8));
        ctx.lineTo(panel.Margin, ly - (this.LineGain[0]));
        for (var j=0; j<this.Smoothness; j++) {
            ctx.lineTo(panel.Margin + ((panel.Range/this.Smoothness)*(j+1)), ly  - (this.LineGain[j]));
        }
        ctx.lineTo(panel.Margin + panel.Range, y + (height*0.8));
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = ctx.strokeStyle = App.Palette[1];
        panel.diagonalFill(panel.Margin - units, y + units, panel.Range + (2 * units), height - (2 * units), 9);
        ctx.restore();


        // LINE //
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = App.Palette[App.Color.Txt];
        ctx.beginPath();
        ctx.moveTo(panel.Margin, ly - (this.LineGain[0]));
        for (var j=0; j<this.Smoothness; j++) {
            ctx.lineTo(panel.Margin + ((panel.Range/this.Smoothness)*(j+1)), ly  - (this.LineGain[j]));
        }
        ctx.stroke();
        ctx.lineWidth = 1;



        // HANDLE DOTS //
        for (var j=0; j<4; j++) {
            var hx = panel.Margin + p[j].x;
            var size = 2*units;

            if (j==0 || j== 3) {
                ctx.fillStyle = App.Palette[3 + j];
                ctx.beginPath();
                ctx.moveTo(hx - size, y + (height * 0.9));
                ctx.lineTo(hx, y + (height * 0.9) - size);
                ctx.lineTo(hx + size, y + (height * 0.9));
                ctx.lineTo(hx, y + (height * 0.9) + size);
                ctx.closePath();
                ctx.fill();
            }

        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(panel.Margin, y + (height*0.8));
        ctx.lineTo(panel.Margin + panel.Range, y + (height*0.8));
        ctx.lineTo(panel.Margin + panel.Range, y + height);
        ctx.lineTo(panel.Margin, y + height);
        ctx.closePath();
        ctx.clip();

        for (var j=0; j<4; j++) {
            var hx = panel.Margin + p[j].x;
            if (j!==0 && j!== (3)) {
                this.SubHandles[j].Draw(ctx, hx, y + (height*0.9), height*0.02, App.Palette[3+j]);
            }
        }

        ctx.restore();


        // HANDLES //
        for (var j=0; j<4; j++) {
            var hx = panel.Margin + p[j].x;
            var hy = y + (height*0.8) - p[j].y;
            this.Handles[j].Draw(ctx,hx,hy,height * 0.05,App.Palette[3+j]);
        }

    }

    PlotGraph() {
        super.PlotGraph();

        var p = [];
        for (var j=0; j<4; j++) {
            var x = Math.round((this.Smoothness/this.Size.width) * this.Handles[j].Position.x)-1;
            var y = this.Handles[j].Position.y - (this.Size.height*0.35);
            p[j] = new Point(x,y);
        }

        var q1a = (this.Smoothness/26.5) * (14.5-this.SubHandles[1].Value);
        var q2a = (this.Smoothness/26.5) * (14.5-this.SubHandles[2].Value);

        q1a = this.linValue(this.SubHandles[1].RangeMin,this.SubHandles[1].RangeMax,this.Smoothness*0.02,this.Smoothness*0.55,this.SubHandles[1].Position.x);
        q2a = this.linValue(this.SubHandles[2].RangeMin,this.SubHandles[2].RangeMax,this.Smoothness*0.02,this.Smoothness*0.55,this.SubHandles[2].Position.x);

        this._Gain1 = this.CurvePass("lowshelf",p[0].x,30,p[0].y);
        this._Gain2 = this.CurvePass("peaking",p[1].x,q1a,p[1].y);
        this._Gain3 = this.CurvePass("peaking",p[2].x,q2a,p[2].y);
        this._Gain4 = this.CurvePass("highshelf",p[3].x,30,p[3].y);

        // ADD //
        for (var j=0; j<this.Smoothness; j++) {
            this.LineGain[j] = this._Gain1[j] + this._Gain2[j] + this._Gain3[j] + this._Gain4[j];

            // CAP RANGE //
            if (this.LineGain[j]>(this.Size.height*0.35)) {
                this.LineGain[j] = (this.Size.height*0.35);
            }
            if (this.LineGain[j]< -(this.Size.height*0.35)) {
                this.LineGain[j] = -(this.Size.height*0.35);
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

    logPosition(minpos,maxpos,minval,maxval,value) {
        var minlval = Math.log(minval);
        var maxlval = Math.log(maxval);
        var scale = (maxlval - minlval) / (maxpos - minpos);
        //console.log("" +minval + " | " +maxval + " | " +value);
        return minpos + (Math.log(value) - minlval) / scale;
    }

    linValue(minpos,maxpos,minval,maxval,position) {
        var scale = (maxval - minval) / (maxpos - minpos);
        //console.log("" +minval + " | " +maxval + " | " +position);
        return (position - minpos) * scale + minval;
    }

}