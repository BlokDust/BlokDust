import Vector = Utils.Maths.Vector;
import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../MainScene';
import {Particle} from '../../Particle';
import Point = etch.primitives.Point;
import {PowerSource} from './PowerSource';

declare var App: IApp;

export class ParticleEmitter extends PowerSource {

    //private _rateCounter: number;
    private _LastEmission: number;
    public Params: ParticleEmitterParams;
    public Defaults: ParticleEmitterParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Power.Blocks.ParticleEmitter.name;

        this.Defaults = {
            angle: -90,
            speed: 3,
            rate: 80,
            range: 600,
            selfPoweredMode: false
        };
        this.PopulateParams();

        //this._rateCounter = 0;

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-2,0), new Point(-1,0), new Point(0,-1), new Point(1,0), new Point(2,0), new Point(0,2));
    }


    EmitParticle() {
        var position = App.Metrics.ConvertGridUnitsToAbsolute(this.Position);
        var v: Utils.Maths.Vector = Vector.FromAngle(Math.degreesToRadians(this.Params.angle));
        var velocity: etch.primitives.Vector = new etch.primitives.Vector(v.X, v.Y);
        velocity.Mult(this.Params.speed * 0.1);
        var size = 2 + (Math.random());
        var life = Math.round(this.Params.range/this.Params.speed);

        var p: Particle = App.ParticlesPool.GetObject();

        p.Position = position;
        p.Velocity = velocity;
        p.Life = life;
        p.Size = size;

        App.Particles.push(p);

        this._LastEmission = this.LastVisualTick;
    }


    Update() {
        super.Update();
        
        if (this.Params.selfPoweredMode || this.IsPowered()) {

            if (!this._LastEmission){
                this.EmitParticle();
            } else {
                var ms: number = 1000; // 1 second
                var normalisedRate: number = Math.normalise((510 - this.Params.rate), 0, 500);
                var particlesPerMS: number = ms / normalisedRate;
                var msSinceLastEmission: number = this.LastVisualTick - this._LastEmission;
                if (msSinceLastEmission >= particlesPerMS){
                    this.EmitParticle();
                }
            }

            // ROTATE //
            if (this.Params.angle > 360) {
                this.Params.angle = 1;
            }
        }
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
        //if (window.debug){
        //    this.Ctx.fillStyle = "#fff";
        //    var pos = (<Grid>this.Sketch).ConvertGridUnitsToAbsolute(new Point(this.Position.x+2, this.Position.y-2));
        //    pos = (<Grid>this.Sketch).ConvertBaseToTransformed(pos);
        //    //this.Ctx.fillText(""+(Math.round(this.Params.range/this.Params.speed)/this.Params.rate), pos.x, pos.y);
        //}

    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

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
                    "name" : "Fire Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : 510 - this.Params.rate,
                        "min" : 1,
                        "max" : 500,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "P. Speed",
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
        var val = value;

        if (param=="angle") {
            val = (value-90);
        } else if (param=="rate") {
            val = (510 - value);
        }

        this.Params[""+param] = val;
    }
}
