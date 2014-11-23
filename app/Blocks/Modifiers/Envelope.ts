import EnvelopeComponent = require("../AudioEffectComponents/Envelope");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");

class Envelope extends Modifier {


    constructor(grid: Grid, position: Point){
        super(grid, position);

        var effect = new EnvelopeComponent(0.8, 0.9, 0.9, 0.9);

        this.Effects.Add(effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(0, 1));
    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        this.Ctx.beginPath();
        ctx.fillStyle = "#f22a54";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        ctx.closePath();
        ctx.fill();
    }

}

export = Envelope;