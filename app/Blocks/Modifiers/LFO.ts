

class LFO extends Modifier {

    effect: Tone.LFO;

    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        this.effect = new Tone.LFO(10, 0.3, 0);
        this.effect.setType("triangle");
        this.effect.start();

        this.Effects.Add(this.effect);
    }

}

export = LFO;