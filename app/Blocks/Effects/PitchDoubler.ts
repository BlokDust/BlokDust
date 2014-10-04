import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class PitchDoubler implements IEffect {

    constructor() {

    }

    Connect(modifiable: IModifiable): void{
        var _value = modifiable.Osc.frequency.getValue();
        modifiable.Osc.frequency.setValue(_value * 1.5);

//        modifiable.Osc.setFrequency(modifiable.Osc.frequency.getValue() * 1.5);

    }

    Disconnect(modifiable: IModifiable): void{
        var _value = modifiable.Osc.frequency.getValue();
        modifiable.Osc.frequency.setValue(_value / 1.5);

//        modifiable.Osc.setFrequency(modifiable.Osc.frequency.getValue() / 1.5);
    }
}

export = PitchDoubler;