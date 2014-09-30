/// <reference path="../../refs.ts" />

import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");

class Input extends Modifiable {

    public Osc: Tone.Oscillator;
    private _OscGain: GainNode;


    constructor(position:Point) {
        super(position);
        this.Osc = new Tone.Oscillator(440, "sine");

        this._OscGain = this.Osc.context.createGain();
        this.Osc.connect(this._OscGain);
        this._OscGain.gain.value = 0.3;
        this._OscGain.connect(this.Osc.context.destination); //TODO: Should connect to a master audio gain output with compression (in BlockView?)

        this.ModifiableAttributes = {
            pitch: this.Osc.frequency,
            detune: this.Osc.detune,
            volume: this._OscGain.gain
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

    Update() {
        super.Update();
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
        effect.connect(this.ModifiableAttributes.volume);
    }

    DisconnectEffect(effect: Tone.LFO) {
        console.log("disconnect effect");
        effect.disconnect();
    }
}

export = Input;