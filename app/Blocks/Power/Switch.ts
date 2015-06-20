import Effect = require("../Effect");
import ISource = require("../ISource");
import BlocksSketch = require("../../BlocksSketch");
import Particle = require("../../Particle");

class Switch extends Effect {

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                enabled: 0 //TODO: this line should be boolean when using boolean switch UI
            };
        }

        super.Init(sketch);

        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));
    }

    Attach(source:ISource): void {
        super.Attach(source);

        if (this.Params.enabled) {
            source.TriggerAttack();
        }

    }

    Detach(source:ISource): void {

        if (!source.IsPressed){
            source.TriggerRelease('all');
        }

        super.Detach(source);
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"switch");
    }

    Dispose(){
        super.Dispose();
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Switch",
            "parameters" : [
                {
                    "type" : "slider", //TODO Change to switch UI when available
                    "name" : "Off/On",
                    "setting" :"enabled",
                    "props" : {
                        "value" : this.Params.enabled,
                        "min" : 0,
                        "max" : 1,
                        "quantised" : true
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        if (param=="enabled") {
            //this.Params.enabled = value; //TODO: delete this when we have switch UI
            this.Toggle();
        }

        this.Params[""+param] = value;
    }

    /**
     * When a particle hits a source it triggers the attack and then releases after a time
     * @param particle
     * @constructor
     */
    ParticleCollision(particle: Particle) {
        this.Toggle();
        particle.Dispose();
    }

    Toggle() {
        if (this.Params.enabled) {
            this.Params.enabled = 0;
            for (var i = 0; i < this.Sources.Count; i++) {
                var source = this.Sources.GetValueAt(i);
                source.TriggerRelease('all');
            }

        } else {
            this.Params.enabled = 1;
            for (var i = 0; i < this.Sources.Count; i++) {
                var source = this.Sources.GetValueAt(i);
                source.TriggerAttack();
            }
        }
    }
}

export = Switch;