import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class LFO extends Effect implements IEffect {

    LFO: Tone.LFO;

    constructor(rate, outputMin, outputMax, waveform) {
        super();
        this.LFO = new Tone.LFO(rate, outputMin, outputMax);
        this.LFO.setType(waveform);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        if (this.Modifiable.Source.detune) {
            this.LFO.connect(this.Modifiable.Source.detune);
            this.LFO.start();
        }

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        if (this.Modifiable.Source.detune) {
            if (this.LFO) {
                this.LFO.stop();
                this.LFO.disconnect();
            }
        }
    }

    Delete() {
        this.LFO.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param=="rate") {
            this.LFO.setFrequency(value);
        } else if (param=="depth") {
            this.LFO.setMin(-value);
            this.LFO.setMax(value);
        }
        //console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="rate") {
            val = this.LFO.getFrequency();
        } else if (param=="depth") {
            val = this.LFO.getMax();
        }
        return val;
    }
}

export = LFO;