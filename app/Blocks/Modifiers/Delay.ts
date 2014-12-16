import DelayComponent = require("../AudioEffectComponents/Delay");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Delay extends Modifier {

    Component;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new DelayComponent({
            delayTime: '8n',
            feedback: 0.4, // Max is 1
            dryWet: 0.5
        });

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2),new Point(0, 1),new Point(-1, 2));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[7];// RED
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(1,2);
        this.DrawLineTo(0,1);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[3];// BLUE
        this.DrawMoveTo(-1,1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(1,2);
        this.DrawLineTo(0,1);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.Component.Delete();
    }


}

export = Delay;