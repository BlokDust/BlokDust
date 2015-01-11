import QwertyKeyboard = require("../Controllers/QwertyKeyboard");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");
import IEffect = require("../IEffect");

class Keyboard extends Modifier {

    public Name: string = 'Keyboard';
    public Component: IEffect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new QwertyKeyboard(); // mono or poly?
        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(2,1);
        this.DrawLineTo(1,2);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawLineTo(0,-1);
        this.DrawLineTo(0,1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(1,0);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.Component.Delete();
    }

}

export = Keyboard;