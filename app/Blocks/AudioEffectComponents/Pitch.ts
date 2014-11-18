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
        var _value = this.Modifiable.Source.frequency.getValue();
        this.Modifiable.Source.frequency.setValue(_value * this.PitchIncrement);
        this.Modifiable
    }

    Disconnect(modifiable: IModifiable): void{
        super.Disconnect(modifiable);
        if (this.Modifiable.Params.noise){
            // LFO's and pitches cannot work on Noise Blocks
            return;
        }
        var _value = this.Modifiable.Source.frequency.getValue();
        this.Modifiable.Source.frequency.setValue(_value / this.PitchIncrement);
    }
}

export = PitchComponent;