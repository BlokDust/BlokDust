import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class ChorusComponent extends Effect implements IEffect {

    public Effect: Tone.Chorus;

    constructor(Settings) {
        super();
        this.Effect = new Tone.Chorus({
            "rate" : Settings.rate,
            "delayTime" : Settings.delayTime,
            "type" : Settings.type,
            "depth" : Settings.depth,
            "feedback" : Settings.feedback
        });
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);
    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);
    }

    Delete() {
        this.Effect.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        this.Effect.set(
            jsonVariable
        );
        //console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="rate") {
            val = this.Effect.getRate();
        } else if (param=="delayTime") {
            val = this.Effect.getDelayTime();
        } else if (param=="depth") {
            val = this.Effect.getDepth();
        } else if (param=="feedback") {
            val = this.Effect.getFeedback();
        }

        return val;
    }

}

export = ChorusComponent;