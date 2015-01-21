import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");

class DistortionComponent extends Effect implements IEffect {

    public Effect: Tone.Distortion;

    constructor(distortion: number,wetness: number) {
        super();
        this.Effect = new Tone.Distortion(distortion);
        this.Effect.dryWet.setWet(wetness);
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
            this.Effect.setDistortion(value);
        }

        console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="drive") {
            val = this.Effect.getDistortion();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }

        return val;
        console.log(""+param+" "+val);
    }
}

export = DistortionComponent;