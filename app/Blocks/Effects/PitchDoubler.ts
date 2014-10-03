import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class PitchDoubler implements IEffect {

    constructor() {

    }

    Connect(modifiable: IModifiable): void{

        // Connect them
        modifiable.Osc.frequency = new Tone.Signal(modifiable.Osc.frequency * 2);
    }

    Disconnect(modifiable: IModifiable): void{

        modifiable.Osc.frequency = new Tone.Signal(modifiable.Osc.frequency / 2);
    }
}

export = VolumeDoubler;