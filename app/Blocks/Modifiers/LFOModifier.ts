
import Modifier = require("./../Modifier");

class LFOModifier extends Modifier {

    constructor(point: Point){
        super(point);

        var effect: Tone.LFO = new Tone.LFO(0.3, -80, 80);
        effect.setType("triangle");

        this.Effects.Add(effect);
    }

}

export = LFOModifier;