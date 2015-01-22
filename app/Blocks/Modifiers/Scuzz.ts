import LFOComponent = require("../AudioEffectComponents/LFO");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import App = require("../../App");

class Scuzz extends Modifier {

    public Component: IEffect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new LFOComponent(100, -1000, 1000, 'sawtooth');

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(2, -1),new Point(0, 1),new Point(-1, 0));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[10];// ORANGE
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(2,-1);
        this.DrawLineTo(0,1);
        this.DrawLineTo(-1,0);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[7];// RED
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
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
            "name" : "Scuzz",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Power",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.Component.GetValue("depth"),
                        "min" : 1000,
                        "max" : 10000,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Pulverisation",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.Component.GetValue("frequency"),
                        "min" : 100,
                        "max" : 10000,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        this.Component.SetValue(param,value);
    }

}

export = Scuzz;