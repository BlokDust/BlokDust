import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class AutoWahComponent extends Effect implements IEffect {

    public Effect: Tone.AutoWah;


    constructor(Settings) {
        super();

        this.Effect = new Tone.AutoWah({
            "baseFrequency": Settings.baseFrequency,
            "octaves": Settings.octaves,
            "sensitivity": Settings.sensitivity,
            "gain" : Settings.gain,
            "rolloff" : Settings.rolloff,

            "follower" : {
                "attack": Settings.follower.attack,
                "release": Settings.follower.release
            }
        });
        this.Effect.setSensitivity(-40);
        this.Effect.setOctaves(5);
        this.Effect.setBaseFrequency(100);
        this.Effect.dryWet.setDry(0.6);
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
        } else if (param=="octaves") {
            this.Effect.setOctaves(value);
        } else if (param=="baseFrequency") {
            this.Effect.setBaseFrequency(value);
        }

        console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="octaves") {
            val = this.Effect.getOctaves();
        } else if (param=="baseFrequency") {
            val = this.Effect.getBaseFrequency();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }

        return val;
        console.log(""+param+" "+val);
    }
}

export = AutoWahComponent;