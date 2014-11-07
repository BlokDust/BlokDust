/// <reference path="../../refs.ts" />
import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");

class ToneSource extends Modifiable {

    public Osc: Tone.Oscillator;
    public Envelope: Tone.Envelope;
    public OutputGain: Tone.Signal;
    public Params: ToneSettings;

    constructor(grid: Grid, position: Point) {
        super(grid, position);

        this.Params = {
            oscillator: {
                frequency: 340,
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

        // Define the audio nodes
        this.Osc = new Tone.Oscillator(this.Params.oscillator.frequency, this.Params.oscillator.waveform);
        this.Envelope = new Tone.Envelope(this.Params.envelope.attack, this.Params.envelope.decay, this.Params.envelope.sustain, this.Params.envelope.release);
        this.OutputGain = new Tone.Signal;
        this.OutputGain.output.gain.value = this.Params.output.volume;

        // Connect them up
        this.Envelope.connect(this.Osc.output.gain);
        this.Osc.chain(this.Osc, this.OutputGain, App.AudioMixer.Master);

        // Start
        this.Osc.start();

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

    Update(ctx:CanvasRenderingContext2D) {
        super.Update(ctx);
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