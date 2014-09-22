// Type definitions for Tone.js
// Project: https://github.com/TONEnoTONE/Tone.js
// Definitions by: Luke Phillips <https://github.com/lukephills>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

interface Tone {

    context: AudioContext;
    input: GainNode;
    output: GainNode;

    chain(): void;
    connect(unit: AudioNode, outputNum?:number, inputNum?:number): void;
    dbToGain(db: number): number;
    defaultArg(given: any, fallback: any): any; // if both args are objects, properties added to fallback
    disconnect(): void;
    dispose(): void;
    equalPowerScale(percent:number): number;
    expScale(gain: number): number;
    extend(child: Function, parent?: Function): void;
    fan(): void; // connects first argument to all the other arguments
    frequencyToNote(freq:number):string;
    frequencyToSeconds(freq:number):number;
    gainToDb(gain: number): number;
    interpolate(input: number, outputMin: number, outputMax: number): number;
    isUndef(arg: any): boolean;
    logScale(gain: number): number;
    midiToNote(midiNumber: number): string;
    noGC(): void;
    normalize(input: number, inputMin: number, inputMax: number): number;
    notationToSeconds(notation: string, bpm?: number, timeSignature?: number): number;
    noteToFrequency(note: string): number;
    now(): number;
    optionsObject(values: Array<any>, keys: Array<string>, defaults?:Object): Object;
    receive(channelName: string, input?: AudioNode): void;
    samplesToSeconds(samples: number): number;
    secondsToFrequency(seconds: number): number;
    send(channelName: string, amount: number): GainNode;
    setContext(): void;
    startMobile(): void; // Bind to touchstart to fix IOS6
    ticksToSeconds(transportTime: string, bpm?: number, timeSignature?: number): number;
    toFrequency(time: Tone.Time): number;
    toMaster(): void;
    toSamples(time: Tone.Time): number;
    toSeconds(time?: number, now?: number): number; // no args return now() in seconds
}


declare module Tone {

    // SIGNAL
    interface Signal extends Tone {

        cancelScheduledValues(startTime: Tone.Time): void;
        exponentialRampToValueAtTime(value: number, endTime: Tone.Time): void;
        exponentialRampToValueNow(value: number, endTime: Tone.Time): void;
        getValue(): number;
        linearRampToValueAtTime(value: number, endTime: Tone.Time): void;
        linearRampToValueNow(value: number, endTime: Tone.Time): void;
        setCurrentValueNow(now?: number): number;
        setTargetAtTime(value: number, startTime: Tone.Time, timeConstant: number): void;
        setValue(value: number): void;
        setValueAtTime(value: number, time: Tone.Time): void;
        setValueCurveAtTime(values: Array<number>, startTime: Tone.Time, duration: Tone.Time): void;
        sync(signal: Tone.Signal, ratio?: number): void;
        unsync(): void;
    }

    interface Time{}
    module Source {
        interface State{}
    }


    interface Source extends Tone {

        State: string;
        pause(time: Tone.Time): void;
        setVolume(db: number, fadeTime?: Tone.Time): void;
        start(time?: Tone.Time): void;
        stop(time?: Tone.Time): void;
        sync(delay?: Tone.Time): void;
        unsync(): void;
        state: Tone.Source.State;

    }


    // OSCILLATOR
    var Oscillator: OscillatorFactory;

    interface OscillatorFactory {
        new(frequency: number, type?: string): Oscillator;
        (frequency: number, type?: string): Oscillator;
    }

    interface Oscillator extends Source {

        defaults: Object;
        detune: Tone.Signal;
        frequency: Tone.Signal;
        state: Tone.Source.State;
        onended(func: Function);
        set(params: Object): void;
        setFrequency(val: Tone.Time, rampTime: Tone.Time): void;
        setPhase(degrees: number): void;
        setType(type: string): void;

    }


    // LFO
    var LFO: LFOFactory;

    interface LFOFactory {
        new(rate: number, outputMin?: number, outputMax?: number): LFO;
        (rate: number, outputMin?: number, outputMax?: number): LFO;
    }

    interface LFO extends Tone {

        frequency: Tone.Signal;
        oscillator: Tone.Oscillator;
        set(params: Object): void;
        setFrequency(val: Tone.Time, rampTime: Tone.Time): void;
        setPhase(degrees: number): void;
        setType(type: string): void;

    }



    // FILTER
    var Filter: FilterFactory;

    interface FilterFactory {
        new(freq: number, type?: string, rolloff?: number): Filter;
        (freq: number, type?: string, rolloff?: number): Filter;
    }

    interface Filter extends Tone {

        detune: Tone.Signal;
        frequency: Tone.Signal;
        gain: AudioParam;
        Q: Tone.Signal;
        getType(): string;
        set(params: Object): void;
        setFrequency(val: Tone.Time, rampTime: Tone.Time): void;
        setQ(Q: number): void;
        setRolloff(rolloff: number);
        setType(type: string): void;
    }


    // SCALE
    var Scale: ScaleFactory;

    interface ScaleFactory {
        new(inputMin: number, inputMax: number, outputMin: number, outputMax: number): Scale;
        (inputMin: number, inputMax: number, outputMin: number, outputMax: number): Scale;
    }

    interface Scale extends Tone {

    }
}