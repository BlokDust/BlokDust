import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class PitchDoubler implements IEffect {

    constructor() {

    }

    Connect(modifiable: IModifiable): void{

        modifiable.Osc.setFrequency(880);

    }

    Disconnect(modifiable: IModifiable): void{

        modifiable.Osc.setFrequency(440);
    }
}

export = PitchDoubler;