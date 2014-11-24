import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Source = require("./Source");
import Type = require("../BlockType");
import BlockType = Type.BlockType;
//import Particle = require("../../Particle");

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

        // Define Outline for HitTest
        this.Outline.push(new Point(-2, 0),new Point(0, -2),new Point(2, 0),new Point(1, 1),new Point(-1, 1));
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

    //ParticleCollision(particle: Particle) {
    //
    //    super.ParticleCollision(particle);
    //    particle.Life = -1; // DESTROY PARTICLE
    //
    //    // USE SIGNAL? So we can schedule a sound length properly
    //    // play tone
    //    this.Envelope.triggerAttackRelease(0.1);
    //}


    Update() {
        super.Update();

    }

    // input blocks are red circles
    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        //color(col[2]); // PURPLE
        this.Ctx.fillStyle = "#730081";
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(0,-2);
        this.DrawLineTo(2,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        //color(col[5]); // WHITE
        this.Ctx.fillStyle = "#fff";
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(0,-2);
        this.DrawLineTo(0,0);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        //color(col[1]); // GREEN
        this.Ctx.fillStyle = "#1add8d";
        this.DrawMoveTo(0,-2);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        this.Ctx.closePath();
        this.Ctx.fill();
    }
}

export = ToneSource;