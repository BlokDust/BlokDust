import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Source = require("./Source");
import Type = require("../BlockType");
import BlockType = Type.BlockType;
import Particle = require("../../Particle");

class Soundcloud extends Source {

    public DelayedRelease: number;

    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.Soundcloud;
        this.DelayedRelease = 0;

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    MouseDown() {
        super.MouseDown();

    }

    MouseUp() {
        super.MouseUp();

    }

    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);


        this.DelayedRelease = 5; //TODO, THIS IS SHIT

        particle.Dispose();
    }

    Update() {
        super.Update();

        if (this.DelayedRelease>0) { //TODO, THIS IS SHIT
            this.DelayedRelease -= 1;
            if (this.DelayedRelease==0) {
                this.Envelope.triggerRelease();
            }
        }
    }

    // output blocks are blue circles
    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"soundcloud");

        /*this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[7];// RED
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[10];// ORANGE
        this.DrawMoveTo(1,0);
        this.DrawLineTo(2,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();*/
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Soundcloud",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Playback rate",
                    "setting" :"playbackRate",
                    "props" : {
                        "value" : this.GetValue("playbackRate"),
                        "min" : 0.125,
                        "max" : 8,
                        "quantised" : false,
                        "centered" : true,
                        "logarithmic": true
                    }
                }
            ]
        };
    }

    SetValue(param: string,value: any) {
        super.SetValue(param,value);
    }

    GetValue(param: string){
        var val = super.GetValue(param);
        return val;
    }
}

export = Soundcloud;