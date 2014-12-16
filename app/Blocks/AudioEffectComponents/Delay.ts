import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class Delay extends Effect implements IEffect {


    public Effect: Tone.PingPongDelay;


    constructor(Settings) {
        super();

        this.Effect = new Tone.PingPongDelay(Settings.delayTime);
        this.Effect.setFeedback(Settings.feedback);
        this.Effect.dryWet.setDry(Settings.dryWet);

    }

    Connect(modifiable: IModifiable): void {
        super.Connect(modifiable);

    }

    Disconnect(modifiable: IModifiable): void {
        super.Disconnect(modifiable);

    }

    Delete() {
        this.Effect.dispose();
    }
}

export = Delay;