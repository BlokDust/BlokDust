class AudioMixer {

    public Master: Tone.Master;
    public MasterVolume: number = -10; // in decibels

    constructor() {

        // Master Output
        //this.Master = new Tone.Signal();
        this.Master = Tone.Master;
        //todo: make this a tone master

        // Master Gain Level
        this.Master.volume.value = this.MasterVolume;

    }

}

export = AudioMixer;