import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class EnvelopeComponent implements IEffect {

    public attack: number;
    public decay: number;
    public sustain: number;
    public release: number;


    constructor(attack, decay, sustain, release) {
        this.attack = attack;
        this.decay = decay;
        this.sustain = sustain;
        this.release = release;
    }

    Connect(modifiable: IModifiable): void{
        modifiable.Envelope.setAttack(this.attack);
        modifiable.Envelope.setDecay(this.decay);
        modifiable.Envelope.setSustain(this.sustain);
        modifiable.Envelope.setRelease(this.release);
    }

    Disconnect(modifiable: IModifiable): void{
        modifiable.Envelope.setAttack(modifiable.params.envelope.attack);
        modifiable.Envelope.setDecay(modifiable.params.envelope.decay);
        modifiable.Envelope.setSustain(modifiable.params.envelope.sustain);
        modifiable.Envelope.setRelease(modifiable.params.envelope.release);
    }
}

export = EnvelopeComponent;