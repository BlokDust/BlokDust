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
}

export = AutoWahComponent;