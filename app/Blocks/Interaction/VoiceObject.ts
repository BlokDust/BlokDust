import ISource = require("../ISource");

class VoiceCreator {

    public Source : ISource;
    public Sound: any;
    public Envelope: Tone.AmplitudeEnvelope;
    public ID: number;

    constructor( source, sound, envelope, id ) {
        this.Source = source;
        this.Sound = sound;
        this.Envelope = envelope;
        this.ID = id;
    }

}

export = VoiceCreator;