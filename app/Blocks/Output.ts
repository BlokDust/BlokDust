/// <reference path="../refs.ts" />

import Block = require("./Block");
import IModifiable = require("./IModifiable");

class Output extends Block implements IModifiable {

    private _Osc:Tone.Oscillator;

    constructor(id:number, position:Point) {
        super(id, position);

        this._Osc = new Tone.Oscillator(440, "sine");
        this._Osc.toMaster();
        this._Osc.setVolume(-10);
    }

    Modify(effect:Tone.LFO) {
        // apply the effect
    }

    // output blocks are blue circles
    Draw(ctx:CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.Position.X, this.Position.Y, this.Radius, 0, Math.TAU, false);
        ctx.fillStyle = this.IsPressed ? "#7176e1" : "#000be6";
        ctx.fill();
    }

    Start() {
        this._Osc.start();
    }

    Stop() {
        this._Osc.stop();
    }
}

export = Output;