import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class LFO extends Effect implements IEffect {

    _LFO: Tone.LFO;

    constructor(rate, outputMin, outputMax, waveform) {
        super();
        this._LFO = new Tone.LFO(rate, outputMin, outputMax);
        this._LFO.setType(waveform);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);
        if (this.Modifiable.Params.noise){
            // LFO's and pitches cannot work on Noise Blocks
            //TODO: If its a Noise LFO the volume instead
//            this._LFO.connect(this.Modifiable.OutputGain.gain);
//            this._LFO.start();
            return;
        }

        this._LFO.connect(this.Modifiable.Osc.detune);
        this._LFO.start();

    }

    Disconnect(): void {
        if (this.Modifiable.Params.noise){
            // LFO's and pitches cannot work on Noise Blocks
            return;
        }

        this._LFO.stop();
        this._LFO.disconnect();
        this.Modifiable.Osc.detune.setValue(0);

        //TODO: There is a bug where LFO effect isn't consistent. I've submitted an issue to Yotam
    }
}

export = LFO;