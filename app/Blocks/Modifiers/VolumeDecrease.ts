import VolumeComponent = require("../AudioEffectComponents/Volume");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class VolumeDecrease extends Modifier {

    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new VolumeComponent(0.5);
        this.Effects.Add(effect);
    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 40, 40);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "#BBB" : "#000";
        ctx.fill();
    }

}

export = VolumeDecrease;