/// <reference path="../Refs.ts" />

import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifiable = require("./IModifiable");

class Output extends Block implements IModifiable {

    constructor(position: Point) {
        super(position);
    }

    Modify(effect: Tone.LFO) {
        // apply the effect
        console.log("modifying:" + this.Id);
    }

    Update() {
        super.Update();
    }

    // output blocks are blue circles
    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.arc(this.Position.X, this.Position.Y, this.Radius, 0, Math.TAU, false);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "#7176e1" : "#000be6";
        ctx.fill();
    }
}

export = Output;