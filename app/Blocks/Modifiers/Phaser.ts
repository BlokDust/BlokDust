import PhaserComponent = require("../AudioEffectComponents/Phaser");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import App = require("../../App");

class Phaser extends Modifier {

    public Component: IEffect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new PhaserComponent({
            rate: 0.8,
            depth: 10,
            Q: 10,
            baseFrequency: 1850
        });

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(-1, -2),new Point(1, 0),new Point(1, 2));

    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[9];// PINK
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(-1,-2);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(-1,-1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(1,2);
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
            "name" : "Phaser",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : 0.8,
                        "min" : 0,
                        "max" : 10,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Depth",
                    "setting" :"depth",
                    "props" : {
                        "value" : 10,
                        "min" : 0,
                        "max" : 10,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Frequency",
                    "setting" :"baseFrequency",
                    "props" : {
                        "value" : 1850,
                        "min" : 10,
                        "max" : 2000,
                        "quantised" : true,
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

export = Phaser;