import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class Volume implements IEffect {

    public increment: number;

    constructor(increment) {
        this.increment = increment;
    }

    Connect(modifiable: IModifiable): void{

        modifiable.OutputGain.gain.value *= this.increment;

    }

    Disconnect(modifiable: IModifiable): void{

        modifiable.OutputGain.gain.value /= this.increment;

    }
}

export = Volume;