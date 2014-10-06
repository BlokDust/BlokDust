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
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 30, 30);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(161, 191, 114)" : "rgb(168, 192, 124)";
        ctx.fill();
    }

}

export = Envelope;