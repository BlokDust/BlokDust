import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class EQComponent extends Effect implements IEffect {

    public EQ: Tone.EQ;

    constructor(lowLevel: number, midLevel: number, highLevel: number) {
        super();
        this.EQ = new Tone.EQ({
            lowLevel: lowLevel,
            midLevel: midLevel,
            highLevel: highLevel
        });
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.OutputGain.connect(this.EQ);
        this.EQ.connect(App.AudioMixer.Master);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Modifiable.OutputGain.disconnect();
        this.Modifiable.OutputGain.connect(App.AudioMixer.Master);

    }

    Delete() {
        this.EQ.dispose();
    }
}

export = EQComponent;