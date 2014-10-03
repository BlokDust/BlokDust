/// <reference path="../../refs.ts" />

import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");

class Input extends Modifiable {

    public Osc: Tone.Oscillator;
    public OscOutput: GainNode;

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        this.Osc = new Tone.Oscillator(440, "sine");
        this.OscOutput = this.Osc.context.createGain();
        this.Osc.connect(this.OscOutput);
        this.OscOutput.gain.value = 0.3;
        this.OscOutput.connect(this.Osc.context.destination); //TODO: Should connect to a master audio gain output with compression (in BlockView?)

        this.ModifiableAttributes = {
            pitch: this.Osc.frequency,
            detune: this.Osc.detune,
            volume: this.OscOutput.gain
        };
    }

    MouseDown() {
        super.MouseDown();

        // play a sound
        this.Osc.start();
    }

    MouseUp() {
        super.MouseUp();

        // stop a sound
        this.Osc.stop();
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