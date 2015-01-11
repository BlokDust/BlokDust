import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");


class EnvelopeComponent extends Effect implements IEffect {

    public attack: number;
    public decay: number;
    public sustain: number;
    public release: number;


    constructor(attack, decay, sustain, release) {
        super();
        this.attack = attack;
        this.decay = decay;
        this.sustain = sustain;
        this.release = release;
    }

    Connect(modifiable: IModifiable): void{
        super.Connect(modifiable);

        this.Modifiable.Envelope.setAttack(this.attack);
        this.Modifiable.Envelope.setDecay(this.decay);
        this.Modifiable.Envelope.setSustain(this.sustain);
        this.Modifiable.Envelope.setRelease(this.release);
    }

    Disconnect(modifiable: IModifiable): void{
        super.Disconnect(modifiable);

        this.Modifiable.Envelope.setAttack(this.Modifiable.Settings.envelope.attack);
        this.Modifiable.Envelope.setDecay(this.Modifiable.Settings.envelope.decay);
        this.Modifiable.Envelope.setSustain(this.Modifiable.Settings.envelope.sustain);
        this.Modifiable.Envelope.setRelease(this.Modifiable.Settings.envelope.release);
    }

    Delete() {

    }
}

export = EnvelopeComponent;