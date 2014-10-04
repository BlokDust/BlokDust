import PitchDoublerEffect = require("../Effects/PitchDoubler");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class PitchDoubler extends Modifier {

    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new PitchDoublerEffect();
        this.Effects.Add(effect);
    }

}

export = PitchDoubler;