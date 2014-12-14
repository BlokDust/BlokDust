import LFOComponent = require("../AudioEffectComponents/LFO");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class LFO extends Modifier {


    constructor(grid: Grid, position: Point){
        super(grid, position);

        var effect = new LFOComponent(2, -20, 20, 'triangle');

        this.Effects.Add(effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[9];// PINK
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[6];// YELLOW
        this.DrawMoveTo(0,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,1);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

}

export = LFO;