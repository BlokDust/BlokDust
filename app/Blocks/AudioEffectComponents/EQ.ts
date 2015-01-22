import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class EQComponent extends Effect implements IEffect {

    public Effect: Tone.MultibandEQ;

    constructor(Settings) {
        super();

        this.Effect = new Tone.MultibandEQ([
            {
                "type" : "lowshelf",
                "frequency" : Settings.band1.frequency,
                "rolloff" : -12,
                "Q" : Settings.band1.Q,
                "gain" : Settings.band1.gain
            },
            {
                "type" : "peaking",
                "frequency" : Settings.band2.frequency,
                "rolloff" : -12,
                "Q" : Settings.band2.Q,
                "gain" : Settings.band2.gain
            },
            {
                "type" : "peaking",
                "frequency" : Settings.band3.frequency,
                "rolloff" : -12,
                "Q" : Settings.band3.Q,
                "gain" : Settings.band3.gain
            },
            {
                "type" : "peaking",
                "frequency" : Settings.band4.frequency,
                "rolloff" : -12,
                "Q" : Settings.band4.Q,
                "gain" : Settings.band4.gain
            },
            {
                "type" : "peaking",
                "frequency" : Settings.band5.frequency,
                "rolloff" : -12,
                "Q" : Settings.band5.Q,
                "gain" : Settings.band5.gain
            },
            {
                "type" : "highshelf",
                "frequency" : Settings.band6.frequency,
                "rolloff" : -12,
                "Q" : Settings.band6.Q,
                "gain" : Settings.band6.gain
            }
        ]);
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

        var paramWithBand = param.split("-"),
            param = paramWithBand[0],
            band = parseInt(paramWithBand[1]);

        console.log("param "+param+"; band: "+band);

        var jsonVariable = {};
        jsonVariable[param] = value;

        switch (param){
            case "frequency" : this.Effect.setFrequency(value, band);
                break;
            case "Q" : this.Effect.setQ(value, band);
                break;
            case "gain" : this.Effect.setGain(value, band);
                break;
        }

        //this.Effect.set(
        //    jsonVariable
        //);
        console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);

        var paramWithBand = param.split("-"),
            param = paramWithBand[0],
            band = parseInt(paramWithBand[1]),
            val;

        switch (param){
            case "frequency": val = this.Effect.getFrequency(band);
                break;
            case "Q": val = this.Effect.getQ(band);
                break;
            case "gain": val = this.Effect.getGain(band);
                break;
        }

        return val;
    }

}

export = EQComponent;