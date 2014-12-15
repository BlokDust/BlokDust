import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class ChorusComponent extends Effect implements IEffect {

    public Chorus: Tone.Chorus;

    constructor(Settings) {
        super();
        this.Chorus = new Tone.Chorus({
            "rate" : Settings.rate,
            "delayTime" : Settings.delayTime,
            "type" : Settings.type,
            "depth" : Settings.depth,
            "feedback" : Settings.feedback
        });
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.connect(this.Chorus);
        this.Chorus.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.OutputGain, this.Modifiable.Delay, App.AudioMixer.Master);
    }

    Delete() {
        this.Chorus.dispose();
    }
}

export = ChorusComponent;