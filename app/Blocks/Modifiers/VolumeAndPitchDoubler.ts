import VolumeDoublerEffect = require("../Effects/VolumeDoubler");

class VolumeDoubler extends Modifier {

    //effect: Tone.LFO;

    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);


        var effect = new VolumeDoublerEffect();

        this.Effects.Add(effect);
    }

}

export = VolumeDoubler;