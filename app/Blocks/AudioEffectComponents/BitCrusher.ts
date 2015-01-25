import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class BitCrusherComponent extends Effect implements IEffect {

    public Effect: Tone.BitCrusher;

    constructor(Settings) {
        super();
        this.Effect = new Tone.BitCrusher(Settings.bits);
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
        //console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="bits") {
            val = this.Effect.getBits();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }
        return val;
    }
}

export = BitCrusherComponent;