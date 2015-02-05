import EQComponent = require("../AudioEffectComponents/EQ");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import App = require("../../App");

class EQ extends Modifier {

    public Component: IEffect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new EQComponent({
            band1: {
                frequency: 80,
                Q: 1,
                gain: 0
            },
            band2: {
                frequency: 140,
                Q: 1,
                gain: 0
            },
            band3: {
                frequency: 440,
                Q: 0.5,
                gain: -5
            },
            band4: {
                frequency: 1240,
                Q: 3,
                gain: 5
            },
            band5: {
                frequency: 3000,
                Q: 1,
                gain: 0
            },
            band6: {
                frequency: 12000,
                Q: 1,
                gain: 8
            }
        });

        this.Effects.Add(this.Component);
        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"eq");

        /*this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[3];// BLUE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawLineTo(0,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(2,0);
        this.Ctx.closePath();
        this.Ctx.fill();*/
    }

    Delete(){
        this.Component.Delete();
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "EQ",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Band 1 Frequency",
                    "setting" :"frequency-1",
                    "props" : {
                        "value" : this.Component.GetValue("frequency-1"),
                        "min" : 20,
                        "max" : 20000,
                        "quantised" : false,
                        "centered" : false,
                        "logarithmic": true
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Band 1 Gain",
                    "setting" :"gain-1",
                    "props" : {
                        "value" : this.Component.GetValue("gain-1"),
                        "min" : -12,
                        "max" : 12,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Band 2 Frequency",
                    "setting" :"frequency-2",
                    "props" : {
                        "value" : this.Component.GetValue("frequency-2"),
                        "min" : 20,
                        "max" : 20000,
                        "quantised" : false,
                        "centered" : false,
                        "logarithmic": true
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Band 2 Gain",
                    "setting" :"gain-2",
                    "props" : {
                        "value" : this.Component.GetValue("gain-2"),
                        "min" : -12,
                        "max" : 12,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Band 3 Frequency",
                    "setting" :"frequency-3",
                    "props" : {
                        "value" : this.Component.GetValue("frequency-3"),
                        "min" : 20,
                        "max" : 20000,
                        "quantised" : false,
                        "centered" : false,
                        "logarithmic": true
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Band 3 Gain",
                    "setting" :"gain-3",
                    "props" : {
                        "value" : this.Component.GetValue("gain-3"),
                        "min" : -12,
                        "max" : 12,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Band 4 Frequency",
                    "setting" :"frequency-4",
                    "props" : {
                        "value" : this.Component.GetValue("frequency-4"),
                        "min" : 20,
                        "max" : 20000,
                        "quantised" : false,
                        "centered" : false,
                        "logarithmic": true
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Band 4 Gain",
                    "setting" :"gain-4",
                    "props" : {
                        "value" : this.Component.GetValue("gain-4"),
                        "min" : -12,
                        "max" : 12,
                        "quantised" : false,
                        "centered" : false
                    }
                },
            ]
        };
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);


        this.Component.SetValue(param,value);

    }

}

export = EQ;