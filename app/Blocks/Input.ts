/// <reference path="../Refs.ts" />

import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifiable = require("./IModifiable");

class Input extends Block implements IModifiable {

    constructor(position:Point) {
        super(position);
    }

    Modify(effect: Tone.LFO) {
        // apply the effect
        console.log("modifying:" + this.Id);
    }

    MouseDown() {
        super.MouseDown();

        // play a sound
    }

    MouseUp() {
        super.MouseUp();

        // stop a sound
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