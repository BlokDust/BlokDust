interface ToneSettings {

    noise?: NoiseSettings;

    oscillator?: OscillatorSettings;

    envelope?: EnvelopeSettings;

    keyboard?: KeyboardSettings;

    output?: OutputSettings;

}

interface NoiseSettings {
    waveform?: string;
}

interface OscillatorSettings extends NoiseSettings {
    frequency: number;
}

interface EnvelopeSettings {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
}

interface KeyboardSettings {
    isPolyphonic?: boolean;
    glide?: number;
}

interface OutputSettings {
    volume?: number;
}


