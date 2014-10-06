/// <reference path="../../refs.ts" />

import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");

class Input extends Modifiable {

    public Osc: Tone.Oscillator;
    public Envelope: Tone.Envelope;
    public OscOutput: GainNode;
    public params: {
        oscillator: {
            frequency: number;
            waveform: string;
        }
        envelope: {
            attack: number;
            decay: number;
            sustain: number;
            release: number;
        }
        output: {
            volume: number;
        }
    };

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        //TODO: Shall we save these default parameters in a separate options file?
        this.params = {
            oscillator: {
                frequency: 340,
                waveform: 'square'
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

        this.Osc = new Tone.Oscillator(this.params.oscillator.frequency, this.params.oscillator.waveform);
        this.Envelope = new Tone.Envelope(this.params.envelope.attack, this.params.envelope.decay, this.params.envelope.sustain, this.params.envelope.release);
        this.OscOutput = this.Osc.context.createGain();
        this.OscOutput.gain.value = this.params.output.volume;

        this.Envelope.connect(this.Osc.output.gain);
        this.Osc.chain(this.Osc, this.OscOutput, this.OscOutput.context.destination); //TODO: Should connect to a master audio gain output with compression (in BlockView?)
        this.Osc.start();
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

        ctx.beginPath();
        ctx.arc(this.Position.X, this.Position.Y, this.Radius, 0, Math.TAU, false);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "#e17171" : "#f10000";
        ctx.fill();
    }
}

export = Input;