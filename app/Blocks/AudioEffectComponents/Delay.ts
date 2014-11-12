import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class Delay extends Effect implements IEffect {

    feedbackDelay: Tone.PingPongDelay;

    constructor() {
        super();
        this.feedbackDelay = new Tone.PingPongDelay("8n");

        this.feedbackDelay.setFeedback(0.9); // 90% feedback
        this.feedbackDelay.setWet(1); // 100% wet

    }

    Connect(modifiable: IModifiable): void {
        super.Connect(modifiable);
        // Check if it's an Tone or a Noise
        if (this.Modifiable.Params.oscillator){
            this.Modifiable.Osc.connect(this.feedbackDelay);
        } else {
            this.Modifiable.Noise.connect(this.feedbackDelay);
        }

        this.feedbackDelay.connect(this.Modifiable.OutputGain);

        //TODO: delay should increment values like pitch and volume do
        // If two delays with time of 8n
    }

    Disconnect(modifiable: IModifiable): void {
        super.Disconnect(modifiable);

        if (this.Modifiable.Params.oscillator){
            this.Modifiable.Osc.disconnect();
            this.Modifiable.Osc.connect(this.Modifiable.OutputGain);
        }

        else {
            this.Modifiable.Noise.disconnect();
            this.Modifiable.Noise.connect(this.Modifiable.OutputGain);
        }
    }
}

export = Delay;