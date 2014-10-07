import PitchModule = require("../AudioEffectComponents/Pitch");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class PitchIncrease extends Modifier {

    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new PitchModule(1.5); // Pitch decreases by 4ths

        //TODO: Make pitch modifier take parameter scaled to musical notation: (EXAMPLE 1=A4, 2=Bb4 3=B4, 4=C4...)

        this.Effects.Add(effect);

    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.AbsPosition.X - this.Radius, this.AbsPosition.Y - this.Radius, 40, 40);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(191, 161, 114)" : "rgb(198, 171, 124)";
        ctx.fill();
    }

}

export = PitchIncrease;