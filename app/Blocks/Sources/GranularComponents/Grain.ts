import {IApp} from '../../../IApp';


declare var App: IApp;


export class Grain {

    public Player: Tone.Player;
    public Envelope: Tone.Envelope;

    constructor(a: number,d: number,s: number,r: number,voice) {
        this.Player = new Tone.Player();
        this.Envelope = new Tone.AmplitudeEnvelope(
            a, // Attack
            d, // Decay
            s, // Sustain
            r  // Release
        );

        this.Player.connect(this.Envelope);
        this.Envelope.connect(voice);
    }

}