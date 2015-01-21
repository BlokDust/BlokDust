/**
 * Created by luketwyman on 17/01/2015.
 */

import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class ChompComponent extends Effect implements IEffect {

    public Effect: Tone.Filter;

    constructor(Settings) {
        super();
        this.Effect = new Tone.Filter({
            "type" : Settings.type,
            "frequency" : Settings.frequency,
            "rolloff" : Settings.rolloff,
            "Q" : Settings.Q,
            "gain" : Settings.gain
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
    }
    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="Q") {
            val = this.Effect.getQ();
        } else if (param=="gain") {
            val = this.Effect.getGain();
        }

        return val;
        console.log(""+param+" "+val);
    }

}

export = ChompComponent;