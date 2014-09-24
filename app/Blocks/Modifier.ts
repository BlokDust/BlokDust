/// <reference path="../Refs.ts" />

import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifier extends Block implements IModifier {

    public CatchmentArea: number = 100;
    Effects: ObservableCollection<Tone.LFO> = new ObservableCollection<Tone.LFO>();

    constructor(position:Point) {
        super(position);
    }

    Update() {
        super.Update();
    }

    // modifier blocks are black squares
    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 40, 40);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "#BBB" : "#000";
        ctx.fill();
    }
}

export = Modifier;