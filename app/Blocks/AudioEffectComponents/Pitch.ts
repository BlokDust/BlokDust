import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class PitchComponent extends Effect implements IEffect {

    public PitchIncrement: number;

    constructor(increment) {
        super();
        this.PitchIncrement = increment;
    }

    Connect(modifiable: IModifiable): void {
        super.Connect(modifiable);
        if (this.Modifiable.Params.noise) {
            // LFO's and pitches cannot work on Noise Blocks
            return;
        }
        var _value = this.Modifiable.Osc.frequency.getValue();
        this.Modifiable.Osc.frequency.setValue(_value * this.PitchIncrement);
    }

    Disconnect(): void{
        if (this.Modifiable.Params.noise){
            // LFO's and pitches cannot work on Noise Blocks
            return;
        }
        var _value = this.Modifiable.Osc.frequency.getValue();
        this.Modifiable.Osc.frequency.setValue(_value / this.PitchIncrement);
    }
}

export = PitchComponent;