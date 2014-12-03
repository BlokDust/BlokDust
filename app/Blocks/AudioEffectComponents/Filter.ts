import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class Filter extends Effect implements IEffect {

    Filter: Tone.Filter;

    constructor(frequency:Tone.Signal, type: string, rolloff: number, Q: number) {
        super();
        this.Filter = new Tone.Filter(frequency, type, rolloff);
        this.Filter.setQ(Q);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.connect(this.Filter);
        this.Filter.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Filter.disconnect();

    }
}

export = Filter;