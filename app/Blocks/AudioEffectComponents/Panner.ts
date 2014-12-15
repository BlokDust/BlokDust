import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class PannerComponent extends Effect implements IEffect {

    public Panner: Tone.AutoPanner;

    constructor(Settings) {
        super();

        this.Panner = new Tone.AutoPanner(
            1
        );
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Source.disconnect();

        //TODO:
        //Get an array of all connected modifiers
        //Push this newEffect to the array list

        //this.Modifiable.Source.disconnect();
        //this.Modifiable.Source.connectSeries(this.Modifiable.Source, modifier[0], modifier[1], modifier[2]... this.Modifiable.OutputGain)


        this.Modifiable.Source.connect(this.Panner);
        this.Panner.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        //TODO:
        //Remove this effect from the list
        //Get the updated array of all connected modifiers

        //this.Modifiable.Source.disconnect();
        //this.Modifiable.Source.connectSeries(this.Modifiable.Source, modifier[0], modifier[1], modifier[2]... this.Modifiable.OutputGain)


        this.Modifiable.Source.disconnect();
        this.Modifiable.Source.connectSeries(this.Modifiable.Source, this.Modifiable.OutputGain, this.Modifiable.Delay, App.AudioMixer.Master);

    }

    Delete() {
        this.Panner.dispose();
    }
}

export = PannerComponent;