import Effect = require("../../Effect");
import ISource = require("../../ISource");
import BlocksSketch = require("../../../BlocksSketch");
import Particle = require("../../../Particle");
import ParticleEmitter = require("./../ParticleEmitter");
import Logic = require("./Logic");

class Momentary extends Logic {

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        super.Init(sketch);

        this.Outline.push(new Point(0,-1), new Point(1,-1), new Point(1,1), new Point(0,2), new Point(-1,2), new Point(-1,0));
    }

    Attach(source:ISource): void {
        super.Attach(source);

        if (this.Params.logic) {
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
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"momentary switch");
    }

    Dispose(){
        super.Dispose();
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Momentary Switch",
            "parameters" : [
                {
                    "type" : "slider", //TODO Change to switch UI when available
                    "name" : "Off/On",
                    "setting" :"logic",
                    "props" : {
                        "value" : 0,
                        "min" : 0,
                        "max" : 0,
                        "quantised" : true
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        if (param=="logic") {
            this.PerformLogic();
        }

        //this.Params[""+param] = value;
    }


    PerformLogic() {
        // Momentarily Trigger Attack and then release
        this.Params.logic = true;
        for (var i = 0; i < this.Sources.Count; i++) {
            var source = this.Sources.GetValueAt(i);
            source.TriggerAttackRelease();
            if (source instanceof ParticleEmitter){
                (<ParticleEmitter>source).EmitParticle();
            }
        }
        this.Params.logic = false;
    }
}

export = Momentary;