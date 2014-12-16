import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class EQComponent extends Effect implements IEffect {

    public EQInput: Tone.Signal;
    public Band1: Tone.Filter;
    public Band2: Tone.Filter;
    public Band3: Tone.Filter;
    public Band4: Tone.Filter;
    public Band5: Tone.Filter;
    public Band6: Tone.Filter;
    public EQOutput: Tone.Signal;

    constructor(Settings) {
        super();

        this.Band1 = new Tone.Filter({
            "type" : "lowshelf",
            "frequency" : Settings.band1.frequency,
            "rolloff" : -12,
            "Q" : Settings.band1.Q,
            "gain" : Settings.band1.gain
        });

        this.Band2 = new Tone.Filter({
            "type" : "peaking",
            "frequency" : Settings.band2.frequency,
            "rolloff" : -12,
            "Q" : Settings.band2.Q,
            "gain" : Settings.band2.gain
        });

        this.Band3 = new Tone.Filter({
            "type" : "peaking",
            "frequency" : Settings.band3.frequency,
            "rolloff" : -12,
            "Q" : Settings.band3.Q,
            "gain" : Settings.band3.gain
        });

        this.Band4 = new Tone.Filter({
            "type" : "peaking",
            "frequency" : Settings.band4.frequency,
            "rolloff" : -12,
            "Q" : Settings.band4.Q,
            "gain" : Settings.band4.gain
        });

        this.Band5 = new Tone.Filter({
            "type" : "peaking",
            "frequency" : Settings.band5.frequency,
            "rolloff" : -12,
            "Q" : Settings.band5.Q,
            "gain" : Settings.band5.gain
        });

        this.Band6 = new Tone.Filter({
            "type" : "highshelf",
            "frequency" : Settings.band6.frequency,
            "rolloff" : -12,
            "Q" : Settings.band6.Q,
            "gain" : Settings.band6.gain
        });

        this.EQInput = new Tone.Signal();
        this.EQOutput = new Tone.Signal();

        this.EQInput.connectSeries(this.EQInput, this.Band1, this.Band2, this.Band3, this.Band4, this.Band5, this.Band6, this.EQOutput);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connect(this.EQInput);
        this.EQOutput.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.OutputGain, this.Modifiable.Delay, App.AudioMixer.Master);

    }

    Delete() {
        this.EQInput.dispose();
        this.EQOutput.dispose();
        this.Band1.dispose();
        this.Band2.dispose();
        this.Band3.dispose();
        this.Band4.dispose();
        this.Band5.dispose();
        this.Band6.dispose();
    }
}

export = EQComponent;