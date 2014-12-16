import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class FilterComponent extends Effect implements IEffect {

    public Effect: Tone.Filter;

    constructor(Settings) {
        super();
        this.Effect = new Tone.Filter({
            "type" : Settings.type,
            "frequency" : Settings.frequency,
            "rolloff" : Settings.rolloff,
            "Q" : Settings.Q,
            "gain" : Settings.gain
        });
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

export = FilterComponent;