import LFOComponent = require("../AudioEffectComponents/LFO");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Scuzz extends Modifier {

    effect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.effect = new LFOComponent(440, 200, 1800, 'sawtooth');
        this.effect.LFO.setType('sawtooth');

        this.Effects.Add(this.effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(2, -1),new Point(0, 1),new Point(-1, 0));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[10];// ORANGE
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(2,-1);
        this.DrawLineTo(0,1);
        this.DrawLineTo(-1,0);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[7];// RED
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.effect.Delete();
    }

}

export = Scuzz;