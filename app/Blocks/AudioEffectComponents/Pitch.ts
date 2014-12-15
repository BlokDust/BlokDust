import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import Type = require("../BlockType");
import BlockType = Type.BlockType;


class PitchComponent extends Effect implements IEffect {

    public PitchIncrement: number;

    constructor(increment) {
        super();
        this.PitchIncrement = increment;
    }

    Connect(modifiable: IModifiable): void {
        super.Connect(modifiable);

        if (this.Modifiable.Source.frequency){
            var _value = this.Modifiable.Source.frequency.getValue();
            //var _value = this.Modifiable.Source.StartFrequency;
            this.Modifiable.Source.frequency.setValue(_value * this.PitchIncrement, 0);
        }

    }

    Disconnect(modifiable: IModifiable): void{
        super.Disconnect(modifiable);

        if (this.Modifiable.Source.frequency) {
            var _value = this.Modifiable.Source.frequency.getValue();
            console.log(_value);
            //var _value = this.Modifiable.Source.StartFrequency;
            this.Modifiable.Source.frequency.setValue(_value / this.PitchIncrement, 0);
        }

    }

    Delete() {

    }
}

export = PitchComponent;