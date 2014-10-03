import PitchDoublerEffect = require("../Effects/PitchDoubler");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class PitchDoubler extends Modifier {


    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);


        var effect = new PitchDoublerEffect();

        this.Effects.Add(effect);

    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 40, 40);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(191, 161, 114)" : "rgb(198, 171, 124)";
        ctx.fill();
    }

}

export = PitchDoubler;