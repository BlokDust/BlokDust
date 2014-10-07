/// <reference path="../../refs.ts" />

import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");

class MouseFollower extends Modifiable {

    public Osc: Tone.Oscillator;
    public Envelope: Tone.Envelope;
    public OutputGain: GainNode;
    public Params: ToneSettings;
    private _FollowMouse: boolean = false;

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        this.Params = {
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

        this.Osc = new Tone.Oscillator(this.Params.oscillator.frequency, this.Params.oscillator.waveform);
        this.Envelope = new Tone.Envelope(this.Params.envelope.attack, this.Params.envelope.decay, this.Params.envelope.sustain, this.Params.envelope.release);
        this.OutputGain = this.Osc.context.createGain();
        this.OutputGain.gain.value = this.Params.output.volume;

        this.Envelope.connect(this.Osc.output.gain);
        this.Osc.chain(this.Osc, this.OutputGain, this.OutputGain.context.destination); //TODO: Should connect to a master audio gain output with compression (in BlockView?)
        this.Osc.start();

        window.addEventListener('keydown', (key: any) => {
            if (key.keyCode == 32){
                this.KeyDown();
            }
        });
        window.addEventListener('keyup', (key: any) => {
            if (key.keyCode == 32){
                this.KeyUp();
            }
        });
    }

    MouseDown() {
        super.MouseDown();
    }

    MouseUp() {
        super.MouseUp();
    }

    MouseMove(point: Point) {
        if (this._FollowMouse){
            this.Position = point;
        }
    }

    OnClick(){
        super.OnClick();

        this._FollowMouse = !this._FollowMouse;
    }

    KeyDown() {
        // play tone
        if (this.IsSelected){
            this.Envelope.triggerAttack();
        }
    }

    KeyUp() {
        // stop tone
        if (this.IsSelected) {
            this.Envelope.triggerRelease();
        }
    }

    Update(ctx:CanvasRenderingContext2D) {
        super.Update(ctx);
    }

    // input blocks are red circles
    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.arc(this.AbsPosition.X, this.AbsPosition.Y, this.Radius, 0, Math.TAU, false);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "#e17171" : "#f10000";
        ctx.fill();
    }
}

export = MouseFollower;