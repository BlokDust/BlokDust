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

class ToneSource extends Source {


    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.ToneSource;

        super(grid, position);

        this.Params = {
            oscillator: {
                frequency: 440,
                waveform: 'sawtooth'
            },
            envelope: {
                attack: 0.02,
                decay: 0.5,
                sustain: 0.5,
                release: 0.02
            },
            output: {
                volume: 0.5
            }

        };

        this.Width = 150;
        this.Height = 150;

        // Define Outline for HitTest
        this.Outline.push(new Point(-2, 0), new Point(0, -2), new Point(2, 0), new Point(1, 1), new Point(-1, 1));
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
        this.Envelope.triggerAttackRelease(0.1);

        particle.Dispose();
    }

    Delete() {
        super.Delete();
    }

    Update() {
        super.Update();

    }

    // input blocks are red circles
    Draw() {
        super.Draw();

        //if (this.IsRenderCached) return;
        //console.log("drawing to render cache");

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[5];// PURPLE
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(0,-2);
        this.DrawLineTo(2,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(0,-2);
        this.DrawLineTo(0,0);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawMoveTo(0,-2);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        this.Ctx.closePath();
        this.Ctx.fill();

        //this.IsRenderCached = true;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Tone",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Frequency",
                    "setting" :"frequency",
                    "props" : {
                        "value" : this.GetValue("frequency"),
                        "min" : 10,
                        "max" : 15000,
                        "quantised" : true,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Waveform",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.GetValue("waveform"),
                        "min" : 1,
                        "max" : 4,
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
                case 1: value = "sine";
                    break;
                case 2: value = "square";
                    break;
                case 3: value = "triangle";
                    break;
                case 4: value = "sawtooth";
                    break;
            }
        }

        super.SetValue(param,value);
    }

    GetValue(param: string){
        var val;
        if (param == "waveform") {
            switch(super.GetValue(param)){
                case "sine": val = 1;
                    break;
                case "square": val = 2;
                    break;
                case "triangle": val = 3;
                    break;
                case "sawtooth": val = 4;
                    break;
            }
        } else {
            val = super.GetValue(param)
        }
        return val;
    }
}

export = ToneSource;