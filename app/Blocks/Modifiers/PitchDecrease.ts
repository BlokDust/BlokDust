import PitchModule = require("../AudioEffectComponents/Pitch");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");

class PitchDecrease extends Modifier {

    effect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new PitchModule(0.5); // Pitch decreases by 4ths

        //TODO: Make pitch modifier take parameter scaled to musical notation: (EXAMPLE 1=A4, 2=Bb4 3=B4, 4=C4...)

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(0, 1));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = "#fff";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.Component.Delete();
    }

}

export = PitchDecrease;