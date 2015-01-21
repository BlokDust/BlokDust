import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class ReverbComponent extends Effect implements IEffect {

    public Effect: Tone.Freeverb;

    constructor(roomSize?: number, dampening?: number) {
        super();
        this.Effect = new Tone.Freeverb(roomSize, dampening);
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

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        if (param=="dryWet") {
            this.Effect.dryWet.setWet(value);
        } else if (param=="dampening") {
            this.Effect.setDampening(value);
        } else if (param=="roomSize") {
            this.Effect.setRoomSize(value);
        }
        console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="dryWet") {
            val = this.Effect.getWet();
        } else if (param=="dampening") {
            val = this.Effect.getDampening();
        } else if (param=="roomSize") {
            val = this.Effect.getRoomSize();
        }
        return val;
        console.log(""+param+" "+val);
    }
}

export = ReverbComponent;