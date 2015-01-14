import AutoWahComponent = require("../AudioEffectComponents/AutoWah");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import IEffect = require("../IEffect");
import App = require("../../App");

class AutoWah extends Modifier {

    public Component: IEffect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new AutoWahComponent({

            baseFrequency: 1000,
            octaves: 8,
            sensitivity: 0,
            gain : 35,
            rolloff : -48,

            follower : {
                attack: 0.2,
                release: 1
            }

        });

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(0, -1),new Point(1, -1),new Point(1, 1),new Point(-2, 1));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[3];// BLUE
        this.DrawMoveTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(-2,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(1,-1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(-1,1);
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
            "name" : "Auto Wah",
            "parameters" : [

                {
                    "name" : "Octaves",
                    "setting" :"octaves",
                    "props" : {
                        "value" : 8,
                        "min" : 0,
                        "max" : 10,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "name" : "Frequency",
                    "setting" :"baseFrequency",
                    "props" : {
                        "value" : 1000,
                        "min" : 10,
                        "max" : 2000,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }
}

export = AutoWah;