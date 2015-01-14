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
        this.Effect.set(
            jsonVariable
        );
        console.log(jsonVariable);
    }
}

export = PhaserComponent;