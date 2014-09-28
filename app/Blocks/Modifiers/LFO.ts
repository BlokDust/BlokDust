
import Modifier = require("./../Modifier");

class LFO extends Modifier {

    effect: Tone.LFO;

    constructor(point: Point){
        super(point);

        this.effect = new Tone.LFO(1, 440, 440);
        this.effect.setType("triangle");
        this.effect.start();

        this.Effects.Add(this.effect);
    }

}

export = LFO;