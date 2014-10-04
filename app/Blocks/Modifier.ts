/// <reference path="../Refs.ts" />

import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import IEffect = require("./IEffect");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifier extends Block implements IModifier {

    public CatchmentArea: number = .1; // normalised to 1/10 of blocks view default width
    public Effects: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);
    }

    Update(ctx:CanvasRenderingContext2D) {
        super.Update(ctx);
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