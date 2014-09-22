/// <reference path="../Refs.ts" />

import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifiable = require("./IModifiable");

class Power extends Block implements IModifiable{

    constructor(position:Point) {
        super(position);
    }

    Modify(effect: Tone.LFO) {
        // apply the effect
        console.log("modifying:" + this.Id);
    }

    Update() {
        super.Update();
    }

    // power blocks are green circles
    Draw(ctx: CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.arc(this.Position.X, this.Position.Y, this.Radius, 0, Math.TAU, false);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "#74d544" : "#3cb500";
        ctx.fill();
    }
}

export = Power;