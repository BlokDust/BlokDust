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

        //this.Modifiable.Source.connect(this.Effect);
        //this.Effect.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        //this.Modifiable.Source.disconnect();
        //this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.OutputGain, this.Modifiable.Delay, App.AudioMixer.Master);
    }

    Delete() {
        this.Effect.dispose();
    }
}

export = CompressorComponent;