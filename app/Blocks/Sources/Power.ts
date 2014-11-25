import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifiable = require("../IModifiable");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");

class Power extends Modifiable{

    constructor(grid: Grid, position: Point) {
        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));
    }

    Update() {
        super.Update();
    }

    // power blocks are green circles
    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        //color(col[0]);// BLUE
        this.Ctx.fillStyle = "#40e6ff";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(1,-2);
        this.DrawLineTo(2,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        //color(col[1]); // GREEN
        this.Ctx.fillStyle = "#1add8d";
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        //color(col[5]); // WHITE
        this.Ctx.fillStyle = "#fff";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(1,-2);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        this.Ctx.closePath();
        this.Ctx.fill();
    }
}

export = Power;