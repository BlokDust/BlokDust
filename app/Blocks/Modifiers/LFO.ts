
import Modifier = require("./../Modifier");

class LFO extends Modifier {

    effect: Tone.LFO;

    constructor(point: Point){
        super(point);

        this.effect = new Tone.LFO(10, 0.3, 0);
        this.effect.setType("triangle");
        this.effect.start();

        this.Effects.Add(this.effect);
    }

}

export = LFO;