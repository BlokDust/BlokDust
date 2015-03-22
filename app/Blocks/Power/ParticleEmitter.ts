import Source = require("../Source");
import Grid = require("../../Grid");
import Particle = require("../../Particle");
import BlocksSketch = require("../../BlocksSketch");
import Vector = Fayde.Utils.Vector;

class ParticleEmitter extends Source {

    //public Params: EmitterSettings;
    private _rateCounter: number;


    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Params = {
            angle: -90,
            speed: 5,
            rate: 40,
            range: 600
        };

        this._rateCounter = 0;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-2,0), new Point(-1,0), new Point(0,-1), new Point(1,0), new Point(2,0), new Point(0,2));
    }


    EmitParticle() {
        var position = (<Grid>this.Sketch).ConvertGridUnitsToAbsolute(this.Position);
        var vector = Vector.FromAngle(Math.degreesToRadians(this.Params.angle));
        vector.Mult(this.Params.speed);
        var size = 2 + (Math.random()*1);
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

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"particle emitter");

        //if (window.debug){
        //    this.Ctx.fillStyle = "#fff";
        //    var pos = (<Grid>this.Sketch).ConvertGridUnitsToAbsolute(new Point(this.Position.x+2, this.Position.y-2));
        //    pos = (<Grid>this.Sketch).ConvertBaseToTransformed(pos);
        //    //this.Ctx.fillText(""+(Math.round(this.Params.range/this.Params.speed)/this.Params.rate), pos.x, pos.y);
        //}

    }

    OpenParams() {
        super.OpenParams();

        this.OptionsForm =
        {
            "name" : "Particle Emitter",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Angle",
                    "setting" :"angle",
                    "props" : {
                        "value" : this.Params.angle+90,
                        "min" : -180,
                        "max" : 180,
                        "quantised" : true,
                        "centered" : true
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Speed",
                    "setting" :"speed",
                    "props" : {
                        "value" : this.Params.speed,
                        "min" : 1,
                        "max" : 12,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Delay Time",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.Params.rate-5,
                        "min" : 1,
                        "max" : 500,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Range",
                    "setting" :"range",
                    "props" : {
                        "value" : this.Params.range,
                        "min" : 50,
                        "max" : 2000,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

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
