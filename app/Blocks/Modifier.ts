/// <reference path="../refs.ts" />

import Block = require("./Block");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");

class Modifier extends Block implements IModifier {
    Targets:Array<IModifiable>;

    constructor(id:number, position:Point) {
        super(id, position);

    }

    Effect:Tone.LFO;

    // loop through Targets applying Effect
    Modify() {
        this.Targets.forEach((target:IModifiable) => {
            target.Modify(this.Effect);
        })
    }

    // modifier blocks are black squares
    Draw(ctx:CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 40, 40);
        ctx.fillStyle = this.IsPressed ? "#BBB" : "#000";
        ctx.fill();
    }
}

export = Modifier;