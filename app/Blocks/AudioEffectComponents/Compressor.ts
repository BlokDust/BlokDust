import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class CompressorComponent extends Effect implements IEffect {

    public Compressor: Tone.Filter;

    constructor(frequency: number, type: string, rolloff: number, Q: number) {
        super();
        this.Compressor = new Tone.Filter(frequency, type, rolloff);
        this.Compressor.setQ(Q);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.connect(this.Compressor);
        this.Compressor.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.OutputGain, this.Modifiable.Delay, App.AudioMixer.Master);
    }

    Delete() {
        this.Compressor.dispose();
    }
}

export = CompressorComponent;