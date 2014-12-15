import DelayComponent = require("../AudioEffectComponents/Delay");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Delay extends Modifier {

    effect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.effect = new DelayComponent(0.5, 1.5);  // (DelayTime, Feedback, Dry/Wet) //TODO: Bug in tone where feedback = 2 is infinite feedback and feedback = 0 still has some feedback when it shouldn't. Submitted issue

        this.Effects.Add(this.effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2),new Point(0, 1),new Point(-1, 2));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[7];// RED
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.DrawLineTo(0,1);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[3];// BLUE
        this.DrawMoveTo(-1,1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(1,2);
        this.DrawLineTo(0,1);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.effect.Delete();
    }


}

export = Delay;