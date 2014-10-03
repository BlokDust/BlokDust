import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class PitchDoubler implements IEffect {

    constructor() {

    }

    Connect(modifiable: IModifiable): void{

        modifiable.Osc.setFrequency(modifiable.Osc.frequency.getValue() * 1.5);

    }

    Disconnect(modifiable: IModifiable): void{

        modifiable.Osc.setFrequency(modifiable.Osc.frequency.getValue() / 1.5);
    }
}

export = PitchDoubler;