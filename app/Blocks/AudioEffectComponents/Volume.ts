import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class Volume extends Effect implements IEffect {

    public Effect: Tone.Signal;

    constructor(Settings) {
        super();
        this.Effect = new Tone.Signal();
        this.Effect.output.gain.value = Settings.gain;
    }

    Connect(modifiable: IModifiable): void{
        super.Connect(modifiable);

    }

    Disconnect(modifiable: IModifiable): void{
        super.Disconnect(modifiable);

    }

    Delete() {
        this.Effect.dispose();
    }
}

export = Volume;