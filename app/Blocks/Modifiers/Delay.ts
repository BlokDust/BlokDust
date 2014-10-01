
import Modifier = require("./../Modifier");

class Delay extends Modifier {

    effect: Tone.PingPongDelay;

    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        this.effect = new Tone.PingPongDelay(1);
        this.effect.setFeedback(0.5);

        this.Effects.Add(this.effect);
    }

}

export = Delay;