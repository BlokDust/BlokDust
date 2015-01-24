import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class PannerComponent extends Effect implements IEffect {

    public Effect: Tone.AutoPanner;

    constructor(Settings) {
        super();

        this.Effect = new Tone.AutoPanner({
            "frequency": Settings.frequency
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

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        this.Effect.set(
            jsonVariable
        );
        //console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val = this.Effect.getFrequency();
        return val;
    }
}

export = PannerComponent;