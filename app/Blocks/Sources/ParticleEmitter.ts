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
            angle: -90,
            speed: 5,
            rate: 40,
            range: 600
        };

        this._rateCounter = 0;

        // Define Outline for HitTest
        this.Outline.push(new Point(-2,0), new Point(-1,0), new Point(0,-1), new Point(1,0), new Point(2,0), new Point(0,2));
    }


    EmitParticle() {
        var position = this.Grid.GetAbsPosition(new Point(this.GridPosition.x, this.GridPosition.y));
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
            if (this._rateCounter>=this.Params.rate) {
                this.EmitParticle();
                this._rateCounter = 0;
            }

            // TEMP //
            // RANDOM //
            //this.Params.angle = Math.random()*360;

            // ROTATE //
            //this.Params.angle += 1;
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
            var pos = this.Grid.GetAbsPosition(new Point(this.Position.x+2, this.Position.y-2));
            this.Ctx.fillText(""+(Math.round(this.Params.range/this.Params.speed)/this.Params.rate), pos.x, pos.y);
        }

    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Particle Emitter",
            "parameters" : [

                {
                    "name" : "Angle",
                    "setting" :"angle",
                    "props" : {
                        "value" : 0,
                        "min" : -180,
                        "max" : 180,
                        "quantised" : true,
                        "centered" : true
                    }
                },

                {
                    "name" : "Speed",
                    "setting" :"speed",
                    "props" : {
                        "value" : 5,
                        "min" : 1,
                        "max" : 12,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "name" : "Delay Time",
                    "setting" :"rate",
                    "props" : {
                        "value" : 40,
                        "min" : 1,
                        "max" : 500,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "name" : "Range",
                    "setting" :"range",
                    "props" : {
                        "value" : 600,
                        "min" : 50,
                        "max" : 2000,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);

        if (param=="angle") {
            this.Params[""+param] = (value-90);
        } else if (param=="rate") {
            this.Params[""+param] = (value+5);
        } else {
            this.Params[""+param] = value;
        }


    }
}

export = ParticleEmitter;
