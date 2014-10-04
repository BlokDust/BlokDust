import LFOEffect = require("../Effects/LFO");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class LFO extends Modifier {


    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new LFOEffect();

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

export = LFO;