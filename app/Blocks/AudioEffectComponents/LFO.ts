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
        this.LFO = new Tone.LFO(rate, outputMin, outputMax); // Could do this in the same way as delay - only having one LFO that gets incremented
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
            this.LFO.stop();
            this.LFO.disconnect();


            //TODO: FIX LFO DISCONNECTING MULTIPLE SOURCE BLOCKS BUG
        }
    }

    Delete() {

    }

}

export = LFO;