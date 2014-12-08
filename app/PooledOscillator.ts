import IPooledObject = require("./Core/Resources/IPooledObject");

class PooledOscillator implements IPooledObject {

    public Disposed: boolean = false;
    public Oscillator: Tone.Oscillator;
    public Envelope: Tone.Envelope;


    constructor(frequency: number, waveform: string, attack: number, decay: number, sustain: number, release: number) {
        this.Oscillator = new Tone.Oscillator(frequency, waveform);
        this.Envelope = new Tone.Envelope(attack, decay, sustain, release);
        this.Envelope.connect(this.Oscillator.output.gain);
    }

    Reset(): boolean {

        return true;
    }

    Dispose() {
        this.Oscillator.dispose();
        this.Disposed = true;
    }

    ReturnToPool(): void {

    }
}

export = PooledOscillator;