import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import App = require("../../App");


class BitCrusherComponent extends Effect implements IEffect {

    public Effect: Tone.BitCrusher;

    constructor(Settings) {
        super();
        this.Effect = new Tone.BitCrusher(Settings.bits);
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
}

export = BitCrusherComponent;