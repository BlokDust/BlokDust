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

    public DelayedRelease: number;

    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.ToneSource;
        this.DelayedRelease = 0;

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

    ParticleCollision(particle: Particle) {

        super.ParticleCollision(particle);
        particle.Life = -1; // DESTROY PARTICLE

        // USE SIGNAL? So we can schedule a sound length properly
        // play tone
        this.Envelope.triggerAttack();
        this.DelayedRelease = 5; //TODO, THIS IS SHIT
    }


    Update(ctx:CanvasRenderingContext2D) {
        super.Update(ctx);

        if (this.DelayedRelease>0) { //TODO, THIS IS SHIT
            this.DelayedRelease -= 1;
            if (this.DelayedRelease==0) {
                this.Envelope.triggerRelease();
            }
        }
    }

    // input blocks are red circles
    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        //color(col[2]); // PURPLE
        ctx.fillStyle = "#730081";
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(0,-2);
        this.DrawLineTo(2,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(-1,1);
        ctx.closePath();
        ctx.fill();

        //color(col[5]); // WHITE
        ctx.fillStyle = "#fff";
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(0,-2);
        this.DrawLineTo(0,0);
        this.DrawLineTo(-1,1);
        ctx.closePath();
        ctx.fill();

        //color(col[1]); // GREEN
        ctx.fillStyle = "#1add8d";
        this.DrawMoveTo(0,-2);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        ctx.closePath();
        ctx.fill();
    }
}

export = ToneSource;