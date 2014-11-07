import VolumeComponent = require("../AudioEffectComponents/Volume");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");

class VolumeDecrease extends Modifier {

    constructor(grid: Grid, position: Point){
        super(grid, position);

        var effect = new VolumeComponent(0.5);
        this.Effects.Add(effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(0, 1));
    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.fillStyle = "#40e6ff";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        ctx.closePath();
        ctx.fill();
    }

}

export = VolumeDecrease;