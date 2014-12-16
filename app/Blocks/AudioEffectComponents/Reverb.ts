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
        //
        //this.Modifiable.Source.connect(this.Effect);
        //this.Effect.connect(this.Modifiable.OutputGain);

    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

    }

    Delete() {
        this.Effect.dispose();
    }
}

export = ReverbComponent;