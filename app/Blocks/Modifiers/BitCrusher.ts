import BitCrusherComponent = require("../AudioEffectComponents/BitCrusher");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");

class BitCrusher extends Modifier {

    effect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.effect = new BitCrusherComponent({
            bits: 3
        });

        this.Effects.Add(this.effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(0, 1));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = "#aa3311";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.effect.Delete();
    }

}

export = BitCrusher;