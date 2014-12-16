import FilterComponent = require("../AudioEffectComponents/Filter");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Filter extends Modifier {

    Component;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new FilterComponent({
            type : "lowpass",
            frequency : 440,
            rolloff : -12,
            Q : 1,
            gain : 0
        });




        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -2),new Point(1, 0),new Point(1, 2),new Point(-1, 0));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawMoveTo(-1,-2);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.DrawLineTo(-1,0);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[6];// YELLOW
        this.DrawMoveTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.Component.Delete();
    }

}

export = Filter;