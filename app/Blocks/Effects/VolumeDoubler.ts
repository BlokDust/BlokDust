import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class VolumeDoubler implements IEffect {

    public increment: number;

    constructor(increment) {
        this.increment = increment;
    }

    Connect(modifiable: IModifiable): void{

        modifiable.Osc.output.gain.value *= this.increment;

    }

    Disconnect(modifiable: IModifiable): void{

        modifiable.Osc.output.gain.value /= this.increment;

    }
}

export = VolumeDoubler;