/// <reference path="../../refs.ts" />

import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");

class Input extends Modifiable {

    public Osc: Tone.Oscillator;
    public Envelope: Tone.Envelope;

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        this.Osc = new Tone.Oscillator(440, "square");
        this.Envelope = new Tone.Envelope(0.1, 0.5, 0.2, 0.1);
        this.Envelope.connect(this.Osc.output.gain);

        this.Osc.toMaster(); //TODO: Should connect to a master audio gain output with compression (in BlockView?)
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