//import QwertyKeyboard = require("../Controllers/QwertyKeyboard");
//import IModifier = require("../IModifier");
//import Modifier = require("../Modifier");
//import Grid = require("../../Grid");
//
//class Keyboard extends Modifier {
//
//    public Name: string = 'Keyboard';
//
//    constructor(grid: Grid, position: Point){
//        super(grid, position);
//
//        var effect = new QwertyKeyboard(); // mono or poly?
//        this.Effects.Add(effect);
//
//        // Define Outline for HitTest
//        this.Outline.push(new Point(-2, 0),new Point(0, -2),new Point(2, 0),new Point(0, 2));
//    }
//
//
//    Draw(ctx:CanvasRenderingContext2D) {
//        super.Draw(ctx);
//
//        this.Ctx.beginPath();
//        ctx.fillStyle = "#1add8d";
//        this.DrawMoveTo(-2,0);
//        this.DrawLineTo(0,-2);
//        this.DrawLineTo(2,0);
//        this.DrawLineTo(0,2);
//        ctx.closePath();
//        ctx.fill();
//    }
//
//}
//
//export = Keyboard;