/// <reference path="../refs.ts" />

import Block = require("./Block");
import IModifiable = require("./IModifiable");

class Input extends Block implements IModifiable {

    constructor(id:number, position:Point) {
        super(id, position);
    }

    Modify(effect:Tone.LFO) {
        // apply the effect
    }

    MouseDown() {
        super.MouseDown();
    }

    MouseUp() {
        super.MouseUp();
    }

    // input blocks are red circles
    Draw(ctx:CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.Position.X, this.Position.Y, this.Radius, 0, Math.TAU, false);
        ctx.fillStyle = this.IsPressed ? "#e17171" : "#f10000";
        ctx.fill();
    }
}

export = Input;