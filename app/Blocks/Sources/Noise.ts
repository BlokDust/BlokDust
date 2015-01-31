import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Source = require("./Source");
import Type = require("../BlockType");
import BlockType = Type.BlockType;
import Particle = require("../../Particle");

class Noise extends Source {

    public DelayedRelease: number;

    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.Noise;
        this.DelayedRelease = 0;

        super(grid, position);

        this.Params = {
            noise: {
                waveform: 'brown'
            },
            envelope: {
                attack: 0.02,
                decay: 0.5,
                sustain: 0.5,
                release: 0.02
            },
            output: {
                volume: 1
            }

        };

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
    }

    MouseDown() {
        super.MouseDown();

        // play tone
        this.Envelope.triggerAttack();
    }

    MouseUp() {
        super.MouseUp();

        // stop tone
        this.Envelope.triggerRelease();
    }

    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);

        // USE SIGNAL? So we can schedule a sound length properly
        // play tone
        this.Envelope.triggerAttack();
        this.DelayedRelease = 5; //TODO, THIS IS SHIT

        particle.Dispose();
    }

    Update() {
        super.Update();

        if (this.DelayedRelease>0) { //TODO, THIS IS SHIT
            this.DelayedRelease -= 1;
            if (this.DelayedRelease==0) {
                this.Envelope.triggerRelease();
            }
        }
    }

    // output blocks are blue circles
    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"noise");

        /*this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        this.Ctx.closePath();
        this.Ctx.fill();*/
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Noise",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Waveform",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.GetValue("waveform"),
                        "min" : 1,
                        "max" : 3,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

    SetValue(param: string,value: any) {

        if (param == "waveform") {
            switch(Math.round(value)){
                case 1: value = "white";
                    break;
                case 2: value = "pink";
                    break;
                case 3: value = "brown";
                    break;
            }
        }

        super.SetValue(param,value);
    }

    GetValue(param: string){
        var val;
        if (param == "waveform") {
            switch(super.GetValue(param)){
                case "white": val = 1;
                    break;
                case "pink": val = 2;
                    break;
                case "brown": val = 3;
                    break;
            }
        } else {
            val = super.GetValue(param)
        }
        return val;
    }
}

export = Noise;