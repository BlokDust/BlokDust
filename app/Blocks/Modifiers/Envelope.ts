import EnvelopeComponent = require("../AudioEffectComponents/Envelope");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class Envelope extends Modifier {


    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new EnvelopeComponent(0.8, 0.9, 0.2, 0.9);

        this.Effects.Add(effect);

    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.AbsPosition.X - this.Radius, this.AbsPosition.Y - this.Radius, 30, 30);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(121, 191, 184)" : "rgb(128, 192, 184)";
        ctx.fill();
    }

}

export = Envelope;