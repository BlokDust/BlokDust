import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class PhaserComponent extends Effect implements IEffect {

    public Phaser: Tone.Filter;

    constructor(frequency: number, type: string, rolloff: number, Q: number) {
        super();
        this.Phaser = new Tone.Filter(frequency, type, rolloff);
        this.Phaser.setQ(Q);
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.connect(this.Phaser);
        this.Phaser.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.Delay, this.Modifiable.OutputGain, App.AudioMixer.Master);

    }
}

export = PhaserComponent;