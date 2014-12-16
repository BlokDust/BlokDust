import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class DistortionComponent extends Effect implements IEffect {

    public Effect: Tone.Distortion;

    constructor(distortion: number) {
        super();
        this.Effect = new Tone.Distortion(distortion);
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

export = DistortionComponent;