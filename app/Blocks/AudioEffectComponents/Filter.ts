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

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

    }

    Delete() {
        this.Effect.dispose();
    }
}

export = FilterComponent;