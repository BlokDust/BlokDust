import LFOComponent = require("../AudioEffectComponents/LFO");
import IModifier = require("../IModifier");
import IEffect = require("../IEffect");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class LFO extends Modifier {

    public Component: IEffect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new LFOComponent(2, -20, 20, 'triangle');

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[9];// PINK
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[6];// YELLOW
        this.DrawMoveTo(0,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,1);
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
            "name" : "LFO",
            "parameters" : [

                {
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : 1,
                        "min" : 0,
                        "max" : 20,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "name" : "Depth",
                    "setting" :"depth",
                    "props" : {
                        "value" : 20,
                        "min" : 0,
                        "max" : 200,
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

export = LFO;