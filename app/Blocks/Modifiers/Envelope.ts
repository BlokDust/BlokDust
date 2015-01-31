import EnvelopeComponent = require("../AudioEffectComponents/Envelope");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import App = require("../../App");

class Envelope extends Modifier {

    public Component: IEffect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new EnvelopeComponent(1, 5, 0.7, 4);

        this.Effects.Add(this.Component);
        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"envelope");

        /*this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[6];// YELLOW
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[3];// BLUE
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,2);
        this.Ctx.closePath();
        this.Ctx.fill();*/
    }

    Delete(){
        this.Component.Delete();
    }

    OpenParams() {
        super.OpenParams();

        /*this.ParamJson =
        {
            "name": "Envelope",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Attack",
                    "setting": "attack",
                    "props": {
                        "value": this.Component.GetValue("attack"),
                        "min": 0.01,
                        "max": 5,
                        "quantised": false,
                        "centered": false
                    }
                },

                {
                    "type" : "slider",
                    "name": "Decay",
                    "setting": "decay",
                    "props": {
                        "value": this.Component.GetValue("decay"),
                        "min": 0.01,
                        "max": 10,
                        "quantised": false,
                        "centered": false
                    }
                },

                {
                    "type" : "slider",
                    "name": "Sustain",
                    "setting": "sustain",
                    "props": {
                        "value": this.Component.GetValue("sustain"),
                        "min": 0,
                        "max": 1,
                        "quantised": false,
                        "centered": false
                    }
                },

                {
                    "type" : "slider",
                    "name": "Release",
                    "setting": "release",
                    "props": {
                        "value": this.Component.GetValue("release"),
                        "min": 0.01,
                        "max": 15,
                        "quantised": false,
                        "centered": false
                    }
                }
            ]
        };*/

        this.ParamJson =
        {
            "name": "Envelope",
            "parameters": [

                {
                    "type" : "ADSR",
                    "name": "ADSR",
                    "setting": "adsr",
                    "nodes": [
                        {
                            "setting": "attack",
                            "value": this.Component.GetValue("attack"),
                            "min": 0.01,
                            "max": 10
                        },

                        {
                            "setting": "decay",
                            "value": this.Component.GetValue("decay"),
                            "min": 0.01,
                            "max": 15
                        },

                        {
                            "setting": "sustain",
                            "value": this.Component.GetValue("sustain"),
                            "min": 0,
                            "max": 1
                        },

                        {
                            "setting": "release",
                            "value": this.Component.GetValue("release"),
                            "min": 0.01,
                            "max": 15
                        }
                    ]
                }
            ]
        };

    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        this.Component.SetValue(param,value);
    }
}

export = Envelope;