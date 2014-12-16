import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class FilterComponent extends Effect implements IEffect {

    public Filter: Tone.Filter;

    constructor(Settings) {
        super();
        this.Filter = new Tone.Filter({
            "type" : Settings.type,
            "frequency" : Settings.frequency,
            "rolloff" : Settings.rolloff,
            "Q" : Settings.Q,
            "gain" : Settings.gain
        });
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.connect(this.Filter);
        this.Filter.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.OutputGain, this.Modifiable.Delay, App.AudioMixer.Master);
    }

    Delete() {
        this.Filter.dispose();
    }
}

export = FilterComponent;