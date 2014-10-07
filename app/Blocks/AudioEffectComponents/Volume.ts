import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class Volume extends Effect implements IEffect {

    public increment: number;

    constructor(increment) {
        super();
        this.increment = increment;
    }

    Connect(modifiable: IModifiable): void{
        super.Connect(modifiable);
        this.Modifiable.OutputGain.gain.value *= this.increment;

    }

    Disconnect(): void{

        this.Modifiable.OutputGain.gain.value /= this.increment;

    }
}

export = Volume;