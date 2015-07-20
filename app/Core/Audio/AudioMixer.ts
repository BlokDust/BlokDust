class AudioMixer {

    public Master: Tone.Master;
    public MasterVolume: number = -10; // in decibels

    constructor() {

        // Master Output
        this.Master = Tone.Master;

        // Master Gain Level
        this.Master.volume.value = this.MasterVolume;

    }

}

export = AudioMixer;