import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class Delay implements IEffect {

    feedbackDelay: Tone.PingPongDelay;

    constructor() {
        this.feedbackDelay = new Tone.PingPongDelay("8n");

        this.feedbackDelay.setFeedback(0.9); // 90% feedback
        this.feedbackDelay.setWet(1); // 100% wet

    }

    Connect(modifiable: IModifiable): void{
        modifiable.Osc.connect(this.feedbackDelay);
        this.feedbackDelay.connect(modifiable.OscOutput);

    }

    Disconnect(modifiable: IModifiable): void {
        modifiable.Osc.disconnect();
        modifiable.Osc.connect(modifiable.OscOutput);

        //TODO: Do some sort of fade out to stop clicking
    }
}

export = Delay;