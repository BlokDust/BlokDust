import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class LFO implements IEffect {

    _LFO: Tone.LFO;

    constructor() {
        this._LFO = new Tone.LFO(3, -240, 480);
        this._LFO.setType("triangle");
    }

    Connect(modifiable: IModifiable): void{

        console.log(modifiable.Osc.detune.getValue());
        this._LFO.connect(modifiable.Osc.detune);
        this._LFO.start();
        console.log(modifiable.Osc.detune.getValue());

    }

    Disconnect(modifiable: IModifiable): void {
        this._LFO.stop();
        this._LFO.disconnect();
        modifiable.Osc.detune.setValue(0);
        console.log(modifiable.Osc.detune.getValue());

        //TODO: There is a bug where LFO effect isn't consistent. I've submitted an issue to Yotam
    }
}

export = LFO;