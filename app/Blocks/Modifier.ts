/// <reference path="../Refs.ts" />

import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import IEffect = require("./IEffect");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifier extends Block implements IModifier {

    public CatchmentArea: number = .1; // normalised to 1/10 of blocks view default width
    Effects: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);
    }

    Update(ctx:CanvasRenderingContext2D) {
        super.Update(ctx);
    }

}

export = Modifier;