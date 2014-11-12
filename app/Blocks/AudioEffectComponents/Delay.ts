import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class Delay extends Effect implements IEffect {


    public DelayTimeIncrement: number;
    public DelayFeedbackIncrement: number;
    public DryWet: number;

    PingPongDelay: Tone.PingPongDelay;

    constructor(delayTimeIncrement, delayFeedbackIncrement) {
        super();

        this.DelayTimeIncrement = delayTimeIncrement;
        this.DelayFeedbackIncrement = delayFeedbackIncrement;

    }

    Connect(modifiable: IModifiable): void {
        super.Connect(modifiable);

        var _delayTime = this.Modifiable.Delay.delayTime.getValue();
        this.Modifiable.Delay.setDelayTime(_delayTime * this.DelayTimeIncrement);

        var _feedback = this.Modifiable.Delay.feedback.getValue();
        this.Modifiable.Delay.setFeedback(_feedback * this.DelayFeedbackIncrement);

        this.Modifiable.Delay.setWet(0.5);

    }

    Disconnect(modifiable: IModifiable): void {
        super.Disconnect(modifiable);

        var _value = this.Modifiable.Delay.delayTime.getValue();
        this.Modifiable.Delay.setDelayTime(_value / this.DelayTimeIncrement);

        var _feedback = this.Modifiable.Delay.feedback.getValue();
        this.Modifiable.Delay.setFeedback(_feedback / this.DelayFeedbackIncrement);

        this.Modifiable.Delay.dryWet.setWet(0);
    }
}

export = Delay;