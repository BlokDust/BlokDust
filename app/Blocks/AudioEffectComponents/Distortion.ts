import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");

class DistortionComponent extends Effect implements IEffect {

    public Effect: Tone.Distortion;

    constructor(distortion: number) {
        super();
        this.Effect = new Tone.Distortion(distortion);
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
        this.Effect.setDistortion(value);


        console.log(jsonVariable);
    }
}

export = DistortionComponent;