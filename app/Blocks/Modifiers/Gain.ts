import VolumeComponent = require("../AudioEffectComponents/Volume");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import AudioSettings = require("../../Core/Audio/AudioSettings");

class Volume extends Modifier {

    public Component: IEffect;
    public Settings: ToneSettings = new AudioSettings();

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new VolumeComponent({
            gain: 1
        });

        this.Effects.Add(this.Component);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(0, 1));
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = "#40e6ff";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    Delete(){
        this.Component.Delete();
    }

}

export = Volume;