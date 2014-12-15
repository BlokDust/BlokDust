import PhaserComponent = require("../AudioEffectComponents/Phaser");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Phaser extends Modifier {


    constructor(grid: Grid, position: Point){
        super(grid, position);

        var effect = new PhaserComponent({
            rate: 0.8,
            depth: 10,
            Q: 10,
            baseFrequency: 1850
        });

        this.Effects.Add(effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(-1, -2),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[9];// PINK
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(-1,-2);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(-1,-1);
        this.DrawLineTo(1,1);
        this.DrawLineTo(1,2);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

}

export = Phaser;