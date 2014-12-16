import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class BitCrusherComponent extends Effect implements IEffect {

    public Effect: Tone.BitCrusher;

    constructor(Settings) {
        super();
        this.Effect = new Tone.BitCrusher(Settings.bits);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        //this.Modifiable.Source.disconnect();
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

export = BitCrusherComponent;