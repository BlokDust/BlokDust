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
        // Check if it's an Tone or a Noise
        if (modifiable.params.oscillator){
            modifiable.Osc.connect(this.feedbackDelay);
        } else {
            modifiable.Noise.connect(this.feedbackDelay);
        }

        this.feedbackDelay.connect(modifiable.OutputGain);

    }

    Disconnect(modifiable: IModifiable): void {

        if (modifiable.params.oscillator){
            modifiable.Osc.disconnect();
            modifiable.Osc.connect(modifiable.OutputGain);
        }

        else {
            modifiable.Noise.disconnect();
            modifiable.Noise.connect(modifiable.OutputGain);
        }
    }
}

export = Delay;