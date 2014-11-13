import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class LFO extends Effect implements IEffect {

    _LFO: Tone.LFO;

    constructor(rate, outputMin, outputMax, waveform) {
        super();
        this._LFO = new Tone.LFO(rate, outputMin, outputMax); // Could do this in the same way as delay - only having one LFO that gets incremented
        this._LFO.setType(waveform);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        if (this.Modifiable.Params.noise) return;

        this._LFO.connect(this.Modifiable.Osc.detune);
        this._LFO.start();

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        if (this.Modifiable.Params.noise) return;

        this._LFO.stop();
        this._LFO.disconnect();
        this.Modifiable.Osc.detune.setValue(0);

        //TODO: There is a bug where LFO.stop() isn't calling consistently. Will be fixed in next Tone release
    }
}

export = LFO;