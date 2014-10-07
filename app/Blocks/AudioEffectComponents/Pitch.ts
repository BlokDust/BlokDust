import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class PitchComponent extends Effect implements IEffect {

    public increment: number;

    constructor(increment) {
        super();
        this.increment = increment;
    }

    Connect(modifiable: IModifiable): void{
        super.Connect(modifiable);
        if (this.Modifiable.Params.noise){
            // LFO's and pitches cannot work on Noise Blocks
            return;
        }
        var _value = this.Modifiable.Osc.frequency.getValue();
        this.Modifiable.Osc.frequency.setValue(_value * this.increment);
    }

    Disconnect(): void{
        if (this.Modifiable.Params.noise){
            // LFO's and pitches cannot work on Noise Blocks
            return;
        }
        var _value = this.Modifiable.Osc.frequency.getValue();
        this.Modifiable.Osc.frequency.setValue(_value / this.increment);
    }
}

export = PitchComponent;