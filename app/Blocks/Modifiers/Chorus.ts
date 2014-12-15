import ChorusComponent = require("../AudioEffectComponents/Chorus");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Chorus extends Modifier {

    effect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.effect = new ChorusComponent({
            rate : 1,
            delayTime : 2.5,
            type : "triangle",
            depth : 0.4,
            feedback : 0.2
        });

        this.Effects.Add(this.effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(0, -1),new Point(1, 0),new Point(0, 1),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[10];// ORANGE
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[6];// YELLOW
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.effect.Delete();
    }

}

export = Chorus;