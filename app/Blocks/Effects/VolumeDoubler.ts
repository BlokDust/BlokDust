import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class VolumeDoubler implements IEffect {


    constructor() {

    }

    Connect(modifiable: IModifiable): void{

        modifiable.Osc.output.gain.value *= 2;

    }

    Disconnect(modifiable: IModifiable): void{

        modifiable.Osc.output.gain.value /= 2;

    }
}

export = VolumeDoubler;