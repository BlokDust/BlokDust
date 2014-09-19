declare module Tone {

    interface Signal{

    }

    interface Oscillator {
        toMaster(): void;
        setVolume(volume: number): void;
        detune: Signal;
        start(): void;
    }

    interface OscillatorFactory {
        new(frequency: number, type: string): Oscillator;
        (frequency: number, type: string): Oscillator;
    }

    var Oscillator: OscillatorFactory;

    interface LFO {
        start(): void;
        connect(signal: Signal): void;
    }

    interface LFOFactory {
        new(rate: number, outputMin: number, outputMax: number): LFO;
        (rate: number, outputMin: number, outputMax: number): LFO;
    }

    var LFO: LFOFactory;
}