import VolumeDoublerEffect = require("../Effects/VolumeDoubler");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class VolumeDoubler extends Modifier {

    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new VolumeDoublerEffect();
        this.Effects.Add(effect);
    }

}

export = VolumeDoubler;