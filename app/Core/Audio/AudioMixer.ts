class AudioMixer {

    public Master: Tone.Signal;
    public MasterVolume: number = 1; // Value between 0 and 1

    constructor() {

        // Master Output
        this.Master = new Tone.Signal();

        // Master Volume Level
        this.Master.output.gain.value = this.MasterVolume / 2.5;

        //Connections
        this.Master.toMaster();
    }

}

export = AudioMixer;