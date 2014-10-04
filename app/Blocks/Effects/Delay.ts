import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class Delay implements IEffect {

    private _input: GainNode;
    private _output: GainNode;
    feedbackDelay: any;

    constructor() {
        this.feedbackDelay = new Tone.PingPongDelay("8n");

        this._input = this.feedbackDelay.context.createGain();
        this._output = this.feedbackDelay.context.createGain();


        //60% feedback
        this.feedbackDelay.setFeedback(0.9);
        this.feedbackDelay.setWet(1);
        this._input.connect(this.feedbackDelay);
        this.feedbackDelay.connect(this._output)
    }

    Connect(modifiable: IModifiable): void{

        modifiable.OscOutput.connect(this._input);
        this._output.connect(this.feedbackDelay.context.destination);

    }

    Disconnect(modifiable: IModifiable): void {
        modifiable.OscOutput.disconnect();
        modifiable.OscOutput.connect(modifiable.Osc.context.destination);
        //TODO: Do some sort of fade out to stop clicking
    }
}

export = Delay;