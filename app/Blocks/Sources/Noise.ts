import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");

class Noise extends Modifiable {

    public Noise: Tone.Noise;
    public Envelope: Tone.Envelope;
    public Delay: Tone.PingPongDelay;
    public OutputGain: Tone.Signal;
    public Params: ToneSettings;

    constructor(grid: Grid, position: Point) {
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

        // Define the audio nodes
        this.Noise = new Tone.Noise(this.Params.noise.waveform);
        this.Envelope = new Tone.Envelope(this.Params.envelope.attack, this.Params.envelope.decay, this.Params.envelope.sustain, this.Params.envelope.release);
        this.Delay = new Tone.PingPongDelay(1);
        this.Delay.setWet(0);
        this.OutputGain = new Tone.Signal;
        this.OutputGain.output.gain.value = this.Params.output.volume;

        // Connect them up
        this.Envelope.connect(this.Noise.output.gain);
        this.Noise.chain(this.Noise, this.Delay, this.OutputGain, App.AudioMixer.Master);

        // Start
        this.Noise.start();

        // Define Outline for HitTest
        this.Outline.push(new Point(-2, 0),new Point(0, -2),new Point(2, 0),new Point(0, 2));
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

    // output blocks are blue circles
    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.fillStyle = "#730081";
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(0,-2);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        ctx.closePath();
        ctx.fill();
    }
}

export = Noise;