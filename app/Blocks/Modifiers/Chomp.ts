/**
 * Created by luketwyman on 17/01/2015.
 */

import FilterComponent = require("../AudioEffectComponents/Filter");
import ChompComponent = require("../AudioEffectComponents/Chomp");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import App = require("../../App");

class Chomp extends Modifier {

    public Rate: number;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new ChompComponent({
            type : "peaking",
            frequency : 440,
            rolloff : -12,
            Q : 0.6,
            gain : 25
        });

        this.Effects.Add(this.Component);
        this.OpenParams();


        this.Rate = 13;




        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 1),new Point(0, 2),new Point(-1, 2));

        this.SetFrequency();
    }

    SetFrequency() {
        var me = this;
        setTimeout(function() {
            me.Component.SetValue("frequency",100 + Math.round(Math.random()*10000));
            me.SetFrequency();
        },this.Rate);
    }


    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[7];// RED
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(0,1);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.Component.Delete();
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name": "Chomp",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Rate",
                    "setting": "rate",
                    "props": {
                        "value": Math.round(101-this.Rate),
                        "min": 1,
                        "max": 100,
                        "quantised": true,
                        "centered": false
                    }
                },

                {
                    "type" : "slider",
                    "name": "Width",
                    "setting": "Q",
                    "props": {
                        "value": this.Component.GetValue("Q"),
                        "min": 0.1,
                        "max": 5,
                        "quantised": false,
                        "centered": false
                    }
                },

                {
                    "type" : "slider",
                    "name": "Gain",
                    "setting": "gain",
                    "props": {
                        "value": this.Component.GetValue("gain"),
                        "min": 0,
                        "max": 50,
                        "quantised": false,
                        "centered": false
                    }
                }
            ]
        };
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        if (param == "rate") {
            this.Rate = Math.round(101-value);
        } else {
            this.Component.SetValue(param, value);
        }

    }
}

export = Chomp;