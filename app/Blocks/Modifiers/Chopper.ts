/**
 * Created by luketwyman on 24/01/2015.
 */

/**
 * Created by luketwyman on 17/01/2015.
 */
import VolumeComponent = require("../AudioEffectComponents/Volume");
import ChompComponent = require("../AudioEffectComponents/Chomp");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import App = require("../../App");

class Chopper extends Modifier {

    public Rate: number;
    public Depth: number;
    public Polarity: number;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new VolumeComponent({
            gain: 5
        });

        this.Effects.Add(this.Component);



        this.Rate = 50;
        this.Depth = 4;
        this.Polarity = 0;




        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -2),new Point(1, 0),new Point(1, 2),new Point(-1, 0));

        this.SetVolume();
    }

    SetVolume() {
        var me = this;
        setTimeout(function() {
            if (me) {
                if (me.Polarity==0) {
                    me.Component.SetValue("gain",5-me.Depth);
                    me.Polarity = 1;
                } else {
                    me.Component.SetValue("gain",5);
                    me.Polarity = 0;
                }
                me.SetVolume();
            }

        },this.Rate);
    }


    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[5];// GREEN
        this.DrawMoveTo(-1,-2);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.DrawLineTo(-1,0);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[4];// YELLOW
        this.DrawMoveTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.DrawLineTo(0,1);
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
            "name": "Chopper",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Rate",
                    "setting": "rate",
                    "props": {
                        "value": Math.round(151-this.Rate),
                        "min": 1,
                        "max": 125,
                        "quantised": true,
                        "centered": false
                    }
                },

                {
                    "type" : "slider",
                    "name": "Depth",
                    "setting": "depth",
                    "props": {
                        "value": this.Depth,
                        "min": 0,
                        "max": 5,
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
            this.Rate = Math.round(151-value);
        } else {
            this.Depth = value;
        }

    }
}

export = Chopper;