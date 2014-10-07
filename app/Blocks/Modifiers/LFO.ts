import LFOComponent = require("../AudioEffectComponents/LFO");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class LFO extends Modifier {


    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new LFOComponent(3, -240, 480, 'triangle');

        this.Effects.Add(effect);

    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.AbsPosition.X - this.Radius, this.AbsPosition.Y - this.Radius, 30, 30);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(161, 191, 114)" : "rgb(168, 192, 124)";
        ctx.fill();
    }

}

export = LFO;