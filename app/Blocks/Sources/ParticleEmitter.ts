import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifiable = require("../IModifiable");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Particle = require("../../Particle");
import App = require("../../App");
import Vector = Fayde.Utils.Vector;

class ParticleEmitter extends Modifiable{

    public Params: EmitterSettings;
    private _rateCounter: number;


    constructor(grid: Grid, position: Point) {
        super(grid, position);

        this.Params = {
            angle: 0,
            speed: 2,
            rate: 10,
            range: 250
        };

        this._rateCounter = 0;

        // Define Outline for HitTest
        this.Outline.push(new Point(-2,0), new Point(-1,0), new Point(0,-1), new Point(1,0), new Point(2,0), new Point(0,2));
    }


    EmitParticle() {
        var position = this.Grid.ConvertGridUnitsToAbsolute(this.Position);
        var vector = Vector.FromAngle(Math.degreesToRadians(this.Params.angle));
        vector.Mult(this.Params.speed);
        var size = 3 + (Math.random()*2);
        var life = Math.round(this.Params.range/this.Params.speed);

        var p: Particle = App.ParticlesPool.GetObject();

        p.Position = position;
        p.Vector = vector;
        p.Life = life;
        p.Size = size;

        App.Particles.push(p);
    }


    Update() {
        super.Update();

        if (this._rateCounter!==undefined) { //TODO.  < THIS IS SHIT.

            this._rateCounter += 1; // POSSIBLY MOVE TO A SET TIMEOUT, IF IT WOULD PERFORM BETTER
            if (this._rateCounter==this.Params.rate) {
                this.EmitParticle();
                this._rateCounter = 0;
            }

            // TEMP //
            // RANDOM //
            //this.Params.angle = Math.random()*360;

            // ROTATE //
            this.Params.angle += 1;
            if (this.Params.angle>360) {
                this.Params.angle = 1;
            }

        }
    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        //color(col[2]);// PURPLE
        this.Ctx.fillStyle = "#730081";
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        //color(col[4]); // RED
        this.Ctx.fillStyle = "#f22a54";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        if (window.debug){
            this.Ctx.fillStyle = "#fff";
            var pos = this.Grid.ConvertGridUnitsToAbsolute(new Point(this.Position.x+2, this.Position.y-2));
            pos = this.Grid.ConvertBaseToTransformed(pos);
            this.Ctx.fillText(""+(Math.round(this.Params.range/this.Params.speed)/this.Params.rate), pos.x, pos.y);
        }

    }
}

export = ParticleEmitter;
