/// <reference path="../Refs.ts" />

import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifiable = require("./IModifiable");

class Input extends Block implements IModifiable {

    private _Osc: Tone.Oscillator;

    constructor(position:Point) {
        super(position);

        this._Osc = new Tone.Oscillator(440, "sine");
        this._Osc.toMaster();
        this._Osc.setVolume(-10);
    }

    Modify(effect: Tone.LFO) {
        // apply the effect
        console.log("modifying:" + this.Id);
        //effect.connect(this._Osc.frequency);
    }

    MouseDown() {
        super.MouseDown();

        // play a sound
        this._Osc.start();
    }

    MouseUp() {
        super.MouseUp();

        // stop a sound
        this._Osc.stop();
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
}

export = Input;