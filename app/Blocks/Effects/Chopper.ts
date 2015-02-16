import Gain = require("./Gain");
import Effect = require("../Effect");
import Grid = require("../../Grid");
import App = require("../../App");

class Chopper extends Effect {

    public Rate: number;
    public Depth: number;
    public Polarity: number;
    public Transport;
    public Timer;
    public Effect: Tone.Signal;

    constructor(grid: Grid, position: Point){

        this.Effect = new Tone.Signal();
        this.Effect.output.gain.value = 5; //TODO: This is shit

        super(grid, position);

        this.Rate = 50;
        this.Depth = 4;
        this.Polarity = 0;

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));

        //this.Transport = Tone.Transport;
        //this.Transport.start();
        this.SetVolume();
    }

    SetVolume() {
        var me = this;
        this.Timer = setTimeout(function() {
            if (me.Effect) {
                if (me.Polarity==0) {
                    me.SetValue("gain",5-me.Depth);
                    me.Polarity = 1;
                } else {
                    me.SetValue("gain",5);
                    me.Polarity = 0;
                }
                me.SetVolume();
            }

        },this.Rate);
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"chopper");
    }

    Delete(){
        //this.Transport.stop();
        clearTimeout(this.Timer);
        this.Effect.dispose();
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
        } else if (param == "gain") {
            //TODO: DO SOME MATH TO MAKE THE NUMBERS BETTER
            value  = (value + 10) * 0.5;
            this.Effect.output.gain.value = value;
        } else {
            this.Depth = value
        }
    }
}

export = Chopper;