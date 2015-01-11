import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");

class TremeloComponent extends Effect implements IEffect {

    Effect: Tone.LFO;

    constructor(rate, outputMin, outputMax, waveform) {
        super();
        this.Effect = new Tone.LFO(rate, outputMin, outputMax);
        this.Effect.setType(waveform);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

    }

    Delete() {
        this.Effect.dispose();
    }

}

export = TremeloComponent;