import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class AutoWah extends Modifier {

    //public Component: IEffect;
    public Effect: Tone.AutoWah;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Effect = new Tone.AutoWah({
            "baseFrequency": 100,
            "octaves": 5,
            "sensitivity": -40,
            "gain" : 35,
            "rolloff" : -48,

            "follower" : {
                "attack": 0.2,
                "release": 1
            }
        });
        this.Effect.setSensitivity(-40);
        this.Effect.setOctaves(5);
        this.Effect.setBaseFrequency(100);
        this.Effect.dryWet.setDry(0.6);

        //this.Effects.Add(this.Component);
        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(0, -1),new Point(1, -1),new Point(1, 1),new Point(-2, 1));
    }

    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"autowah");

        /*this.Ctx.beginPath();
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
        this.Ctx.fill();*/
    }

    //Connect(modifiable:IModifiable): void{
    //    super.Connect(modifiable);
    //
    //}
    //
    //Disconnect(modifiable:IModifiable): void {
    //    super.Disconnect(modifiable);
    //
    //}

    Delete() {
        this.Effect.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param=="dryWet") {
            this.Effect.dryWet.setWet(value);
        } else if (param=="octaves") {
            this.Effect.setOctaves(value);
        } else if (param=="baseFrequency") {
            this.Effect.setBaseFrequency(value);
        }

        //console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="octaves") {
            val = this.Effect.getOctaves();
        } else if (param=="baseFrequency") {
            val = this.Effect.getBaseFrequency();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }

        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Auto Wah",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Range",
                    "setting" :"octaves",
                    "props" : {
                        "value" : this.GetValue("octaves"),
                        "min" : 1,
                        "max" : 8,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Frequency",
                    "setting" :"baseFrequency",
                    "props" : {
                        "value" : this.GetValue("baseFrequency"),
                        "min" : 50,
                        "max" : 1200,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Mix",
                    "setting" :"dryWet",
                    "props" : {
                        "value" : this.GetValue("dryWet"),
                        "min" : 0,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }
}

export = AutoWah;