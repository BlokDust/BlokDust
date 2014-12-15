import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class ReverbComponent extends Effect implements IEffect {

    public Reverb: Tone.Freeverb;

    constructor(roomSize?: number, dampening?: number) {
        super();
        this.Reverb = new Tone.Freeverb(roomSize, dampening);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.connect(this.Reverb);
        this.Reverb.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.OutputGain, this.Modifiable.Delay, App.AudioMixer.Master);

    }

    Delete() {
        this.Reverb.dispose();
    }
}

export = ReverbComponent;