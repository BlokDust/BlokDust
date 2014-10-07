import LFOComponent = require("../AudioEffectComponents/LFO");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class Scuzz extends Modifier {


    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new LFOComponent(440, 200, 1800, 'sawtooth');
        effect._LFO.setType('sawtooth');

        this.Effects.Add(effect);

    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.AbsPosition.X - this.Radius, this.AbsPosition.Y - this.Radius, 30, 30);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(161, 101, 84)" : "rgb(168, 102, 84)";
        ctx.fill();
    }

}

export = Scuzz;