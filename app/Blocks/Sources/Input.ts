/// <reference path="../../refs.ts" />

import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");

class Input extends Modifiable {

    public Osc: Tone.Oscillator;

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);
        this.Osc = new Tone.Oscillator(440, "sine");
        this.Osc.toMaster();
        this.Osc.setVolume(-10);
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

    ConnectEffect(effect: Tone.LFO) {
        console.log("connect effect");
        effect.connect(this.Osc.frequency);
    }

    DisconnectEffect(effect: Tone.LFO) {
        console.log("disconnect effect");
        effect.disconnect();
    }
}

export = Input;