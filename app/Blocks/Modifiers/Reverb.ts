import ReverbComponent = require("../AudioEffectComponents/Reverb");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Reverb extends Modifier {

    Component;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new ReverbComponent(0.7, 0.5);

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(2, 0),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[6];// YELLOW
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.Component.Delete();
    }

}

export = Reverb;