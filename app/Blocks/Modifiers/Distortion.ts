import DistortionComponent = require("../AudioEffectComponents/Distortion");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Distortion extends Modifier {


    constructor(grid: Grid, position: Point){
        super(grid, position);

        var effect = new DistortionComponent(1);

        this.Effects.Add(effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[7];// RED
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[9];// PINK
        this.DrawLineTo(-1,-1);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

}

export = Distortion;