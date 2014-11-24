//import IBlock = require("../IBlock");
//import Block = require("../Block");
//import IModifiable = require("../IModifiable");
//import Modifiable = require("../Modifiable");
//import Grid = require("../../Grid");
//
//class Power extends Modifiable{
//
//    constructor(grid: Grid, position: Point) {
//        super(grid, position);
//
//        // Define Outline for HitTest
//        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));
//    }
//
//    Update(ctx:CanvasRenderingContext2D) {
//        super.Update(ctx);
//    }
//
//    // power blocks are green circles
//    Draw(ctx: CanvasRenderingContext2D) {
//        super.Draw(ctx);
//
//        this.Ctx.beginPath();
//        //color(col[0]);// BLUE
//        ctx.fillStyle = "#40e6ff";
//        this.DrawMoveTo(-1,0);
//        this.DrawLineTo(1,-2);
//        this.DrawLineTo(2,-1);
//        this.DrawLineTo(2,0);
//        this.DrawLineTo(0,2);
//        this.DrawLineTo(-1,1);
//        ctx.closePath();
//        ctx.fill();
//
//        this.Ctx.beginPath();
//        //color(col[1]); // GREEN
//        ctx.fillStyle = "#1add8d";
//        this.DrawMoveTo(0,0);
//        this.DrawLineTo(1,-1);
//        this.DrawLineTo(2,0);
//        this.DrawLineTo(0,2);
//        ctx.closePath();
//        ctx.fill();
//
//        this.Ctx.beginPath();
//        //color(col[5]); // WHITE
//        ctx.fillStyle = "#fff";
//        this.DrawMoveTo(-1,0);
//        this.DrawLineTo(1,-2);
//        this.DrawLineTo(1,-1);
//        this.DrawLineTo(0,0);
//        ctx.closePath();
//        ctx.fill();
//    }
//}
//
//export = Power;