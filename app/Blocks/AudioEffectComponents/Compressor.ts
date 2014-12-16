import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class CompressorComponent extends Effect implements IEffect {

    public Effect: Tone.Filter;

    constructor(frequency: number, type: string, rolloff: number, Q: number) {
        super();
        this.Effect = new Tone.Filter(frequency, type, rolloff);
        this.Effect.setQ(Q);
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

export = CompressorComponent;