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


    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        if (param=="dryWet") {
            this.Effect.dryWet.setWet(value);
        } else {
            this.Effect.set(
                jsonVariable
            );
        }
        //console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="delayTime") {
            val = this.Effect.getDelayTime();
        } else if (param=="feedback") {
            val = this.Effect.getFeedback();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }
        return val;
    }
}

export = Delay;