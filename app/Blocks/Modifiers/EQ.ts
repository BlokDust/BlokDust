import EQComponent = require("../AudioEffectComponents/EQ");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class EQ extends Modifier {

    effect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.effect = new EQComponent({
            band1: {
                frequency: 80,
                Q: 1,
                gain: 0
            },
            band2: {
                frequency: 140,
                Q: 1,
                gain: 0
            },
            band3: {
                frequency: 440,
                Q: 0.5,
                gain: -5
            },
            band4: {
                frequency: 1240,
                Q: 3,
                gain: 5
            },
            band5: {
                frequency: 3000,
                Q: 1,
                gain: 0
            },
            band6: {
                frequency: 12000,
                Q: 1,
                gain: 8
            }
        });

        this.Effects.Add(this.effect);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[3];// BLUE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawLineTo(0,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(2,0);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.effect.Delete();
    }

}

export = EQ;