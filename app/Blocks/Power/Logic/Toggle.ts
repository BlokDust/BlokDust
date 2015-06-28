import Effect = require("../../Effect");
import ISource = require("../../ISource");
import BlocksSketch = require("../../../BlocksSketch");
import Particle = require("../../../Particle");
import Logic = require("./Logic");

class Toggle extends Logic {

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        super.Init(sketch);

        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));
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
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"toggle switch");
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Toggle Switch",
            "parameters" : [
                {
                    "type" : "slider", //TODO Change to switch UI when available
                    "name" : "Off/On",
                    "setting" :"logic",
                    "props" : {
                        "value" : this.Params.logic,
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

        if (param=="logic") {
            this.PerformLogic();
        }

        this.Params[""+param] = value;
    }

    PerformLogic() {
        super.PerformLogic();
        if (this.Params.logic) {
            this.Params.logic = 0;
            for (var i = 0; i < this.Sources.Count; i++) {
                var source = this.Sources.GetValueAt(i);
                source.TriggerRelease('all');
            }

        } else {
            this.Params.logic = 1;
            for (var i = 0; i < this.Sources.Count; i++) {
                var source = this.Sources.GetValueAt(i);
                source.TriggerAttack();
            }
        }
    }
}

export = Toggle;