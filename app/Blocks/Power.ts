/// <reference path="../refs.ts" />

import Block = require("./Block");
import IModifiable = require("./IModifiable");

class Power extends Block implements IModifiable{

    constructor(id: number, position: Point){
        super(id, position);
    }

    Modify(effect: Tone.LFO) {
        // apply the effect
    }

    // power blocks are yellow circles
    Draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.Position.X, this.Position.Y, this.Radius, 0, Math.TAU, false);
        ctx.fillStyle = this.IsPressed ? "#efd457" : "#e8bf00";
        ctx.fill();
    }
}

export = Power;