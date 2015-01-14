import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");

class TremoloComponent extends Effect implements IEffect {

    Tremolo: Tone.LFO;

    constructor(rate, outputMin, outputMax, waveform) {
        super();
        this.Tremolo = new Tone.LFO(rate, outputMin, outputMax);
        this.Tremolo.setType(waveform);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        //TODO: Make tremolo an effect within Tone that can be chained like other effects. This should stop clicking

        this.Tremolo.connect(this.Modifiable.OutputGain);
        this.Tremolo.start();
    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);
        this.Tremolo.disconnect();
        this.Tremolo.stop();
    }

    Delete() {
        this.Tremolo.dispose();
    }

}

export = TremoloComponent;