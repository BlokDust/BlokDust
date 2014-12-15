import AutoWahComponent = require("../AudioEffectComponents/AutoWah");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import IEffect = require("../IEffect");

class AutoWah extends Modifier {

    effect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.effect = new AutoWahComponent({

            baseFrequency: 1000,
            octaves: 8,
            sensitivity: 0,
            gain : 40,
            rolloff : -48,

            follower : {
                attack: 0.2,
                release: 1
            }

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

export = AutoWah;