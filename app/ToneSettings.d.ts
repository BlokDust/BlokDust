interface ToneSettings {

    noise?: NoiseSettings;

    oscillator?: OscillatorSettings;

    envelope?: EnvelopeSettings;

    output?: OutputSettings;

}


interface NoiseSettings {
    waveform?: string;
}

interface EnvelopeSettings {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
}

interface OutputSettings {
    volume?: number;
}


interface OscillatorSettings {
    frequency: number;
    waveform: string;
}


