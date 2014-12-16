import EnvelopeComponent = require("../AudioEffectComponents/Envelope");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Envelope extends Modifier {

    Component;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new EnvelopeComponent(0.8, 0.9, 0.9, 0.9);

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[6];// YELLOW
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[3];// BLUE
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,2);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.Component.Delete();
    }

}

export = Envelope;