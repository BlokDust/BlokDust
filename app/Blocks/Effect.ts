import IModifiable = require("./IModifiable");
import Modifiable = require("./Modifiable");
import IEffect = require("./IEffect");


class Effect implements IEffect {

    Modifiable: IModifiable;
    Params: ToneSettings;

    constructor() {

    }

    Connect(modifiable: IModifiable): void {
        this.Modifiable = modifiable;
    }
    Disconnect(): void {

    }
}

export = Effect;