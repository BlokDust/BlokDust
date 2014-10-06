import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class PitchComponent implements IEffect {

    public increment: number;

    constructor(increment) {
        this.increment = increment;
    }

    Connect(modifiable: IModifiable): void{
        if (modifiable.params.noise){
            // LFO's and pitches cannot work on Noise Blocks
            return;
        }
        var _value = modifiable.Osc.frequency.getValue();
        modifiable.Osc.frequency.setValue(_value * this.increment);
    }

    Disconnect(modifiable: IModifiable): void{
        if (modifiable.params.noise){
            // LFO's and pitches cannot work on Noise Blocks
            return;
        }
        var _value = modifiable.Osc.frequency.getValue();
        modifiable.Osc.frequency.setValue(_value / this.increment);
    }
}

export = PitchComponent;