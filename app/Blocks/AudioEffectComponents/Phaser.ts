import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class PhaserComponent extends Effect implements IEffect {

    public Phaser: Tone.Phaser;

    constructor(Settings) {
        super();
        this.Phaser = new Tone.Phaser({
            "rate" : Settings.rate,
            "depth" : Settings.depth,
            "Q" : Settings.Q,
            "baseFrequency" : Settings.baseFrequency
        });

    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.connect(this.Phaser);
        this.Phaser.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.OutputGain, this.Modifiable.Delay, App.AudioMixer.Master);

    }

    Delete() {
        this.Phaser.dispose();
    }
}

export = PhaserComponent;