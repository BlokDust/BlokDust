import PitchModule = require("../AudioEffectComponents/Pitch");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class PitchDecrease extends Modifier {

    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new PitchModule(0.75); // Pitch decreases by 4ths

        //TODO: Make pitch modifier take parameter scaled to musical notation: (EXAMPLE 1=A4, 2=Bb4 3=B4, 4=C4...)

        this.Effects.Add(effect);

    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 40, 40);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(171, 161, 114)" : "rgb(178, 171, 124)";
        ctx.fill();
    }

}

export = PitchDecrease;