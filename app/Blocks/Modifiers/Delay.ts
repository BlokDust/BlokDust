import DelayEffect = require("../Effects/Delay");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class Delay extends Modifier {


    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new DelayEffect();

        this.Effects.Add(effect);

    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 30, 30);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(161, 131, 184)" : "rgb(168, 132, 184)";
        ctx.fill();
    }

}

export = Delay;