import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class PhaserComponent extends Effect implements IEffect {

    public Effect: Tone.Phaser;

    constructor(Settings) {
        super();
        this.Effect = new Tone.Phaser({
            "rate" : Settings.rate,
            "depth" : Settings.depth,
            "Q" : Settings.Q,
            "baseFrequency" : Settings.baseFrequency
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
        if (param=="dryWet") {
            this.Effect.dryWet.setWet(value);
        } else {
            this.Effect.set(
                jsonVariable
            );
        }
        console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="rate") {
            val = this.Effect.getRate();
        } else if (param=="depth") {
            val = this.Effect.getDepth();
        } else if (param=="baseFrequency") {
            val = this.Effect.getBaseFrequency();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }
        return val;
        console.log(""+param+" "+val);
    }
}

export = PhaserComponent;