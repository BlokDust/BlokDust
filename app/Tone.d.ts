// Type definitions for Tone.js
// Project: https://github.com/TONEnoTONE/Tone.js
// Definitions by: Luke Phillips <https://github.com/lukephills>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

interface Tone {

    context: AudioContext;
    input: GainNode;
    output: GainNode;

    chain(): void;
    connect(unit: any, outputNum?:number, inputNum?:number): void;
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
    var Signal: SignalFactory;

    interface SignalFactory {
        new(value?: number): Signal;
        (value?: number): Signal;
    }
    interface Signal extends Tone {

        cancelScheduledValues(startTime: Tone.Time): void;
        exponentialRampToValueAtTime(value: number, endTime: Tone.Time): void;
        exponentialRampToValueNow(value: number, endTime: Tone.Time): void;
        getValue(): number;
        linearRampToValueAtTime(value: number, endTime: Tone.Time): void;
        linearRampToValueNow(value: number, endTime: Tone.Time): void;
        setCurrentValueNow(now?: number): number;
        setTargetAtTime(value: number, startTime: Tone.Time, timeConstant: number): void;
        setValue(value?: number): void;
        setValueAtTime(value: number, time: Tone.Time): void;
        setValueCurveAtTime(values: Array<number>, startTime: Tone.Time, duration: Tone.Time): void;
        sync(signal: Tone.Signal, ratio?: number): void;
        unsync(): void;
    }

    interface Time{}


    // SOURCE
    var Source: SourceFactory;

    interface SourceFactory {
        new(): Source;
        (): Source;
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

    module Source {
        interface State{}
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
        onended();
        set(params: Object): void;
        setFrequency(val: Tone.Time, rampTime?: Tone.Time): void;
        setPhase(degrees: number): void;
        setType(type: string): void;
        oscillator: OscillatorNode;

    }


    // LFO
    var LFO: LFOFactory;

    interface LFOFactory {
        new(rate: number, outputMin?: number, outputMax?: number): LFO;
        (rate: number, outputMin?: number, outputMax?: number): LFO;
    }

    interface LFO extends Source {

        frequency: Tone.Signal;
        oscillator: Tone.Oscillator;
        set(params: Object): void;
        setFrequency(val: Tone.Time, rampTime?: Tone.Time): void;
        setMax(max: number): void;
        setMin(min: number): void;
        setPhase(degrees: number): void;
        setType(type: string): void;

    }


    // DRY WET
    var DryWet: DryWetFactory;

    interface DryWetFactory {
        new(initialDry?: number): DryWet;
        (initialDry?: number): DryWet;
    }

    interface DryWet extends Tone {
        dry: GainNode;
        wet: GainNode;
        wetness: Tone.Signal;
        setDry(val: number, rampTime?: Tone.Time): void; // 0 - 1
        setWet(val: number, rampTime?: Tone.Time): void;
    }


    // EFFECT
    var Effect: EffectFactory;

    interface EffectFactory {
        new(initialDry?: number): Effect;
        (initialDry?: number): Effect;
    }

    interface Effect extends Tone {
        dryWet: Tone.DryWet;
        effectReturn: GainNode;
        effectSend: GainNode;
        bypass(): void;
        connectEffect(effect: Tone): void;
        set(param: Object): void;
        setDry(dryness: number, rampTime?: Tone.Time): void;
        setPreset(presetName: string): void;
        setWet(wetness: number, rampTime?: Tone.Time): void;
    }



    // ENVELOPE
    var Envelope: EnvelopeFactory;

    interface EnvelopeFactory {
        new(attack: any, decay?: Tone.Time, sustain?: number, release?: Tone.Time): Envelope;
        (type: string): Envelope;
    }

    interface Envelope extends Tone {
        attack: number;
        decay: number;
        max: number;
        min: number;
        release: number;
        sustain: number;
        set(params: Object): void;
        setAttack(time: Tone.Time): void;
        setDecay(time: Tone.Time): void;
        setMax(max: number): void;
        setMin(min: number): void;
        setRelease(time: Tone.Time): void;
        setSustain(time: Tone.Time): void;
        triggerAttack(time?: Tone.Time, velocity?: number): void;
        triggerRelease(time?: Tone.Time): void;
    }


    // FEEDBACK EFFECT
    var FeedbackEffect: FeedbackEffectFactory;

    interface FeedbackEffectFactory {
        new(initialFeedback?: any): FeedbackEffect;
        (initialFeedback?: any): FeedbackEffect;
    }

    interface FeedbackEffect extends Tone.Effect {
        feedback: Tone.Signal;
        setFeedback(value: number, rampTime?: Tone.Time): void;
    }


    // EQ
    var EQ: EQFactory;

    interface EQFactory {
        new(lowLevel?, midLevel?: number, highLevel?: number): EQ;
        (lowLevel?, midLevel?: number, highLevel?: number): EQ;
    }

    interface EQ extends Tone {
        highFrequency: Tone.Signal;
        highGain: GainNode;
        input: GainNode;
        lowFrequency: Tone.Signal;
        lowGain: GainNode;
        midGain: GainNode;
        output: GainNode;
        set(params: Object): void;
        setHigh(db: number): void;
        setLow(db: number): void;
        setMid(db: number): void;
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


    // MASTER
    var Master: MasterFactory;

    interface MasterFactory {
        new(): Master;
        (): Master;
    }

    interface Master extends Tone {
        limiter: DynamicsCompressorNode;
        mute(muted: boolean): void;
        setVolume(db: number, fadeTime?: Tone.Time): void;
    }


    // NOISE
    var Noise: NoiseFactory;

    interface NoiseFactory {
        new(type: string): Noise;
        (type: string): Noise;
    }

    interface Noise extends Source {
        onended();
        setType(type: string, time?: Tone.Time);
    }


    // PANNER
    var Panner: PannerFactory;

    interface PannerFactory {
        new(initialPan?: number): Panner;
        (initialPan?: number): Panner;
    }

    interface Panner extends Tone {
        pan: Tone.Signal;
        setPan(pan: number, rampTime?: Tone.Time): void;
    }

    // PING PONG DELAY
    var PingPongDelay: PingPongDelayFactory;

    interface PingPongDelayFactory {
        new(delayTime: any): PingPongDelay;
        (delayTime: any): PingPongDelay;
    }

    interface PingPongDelay extends StereoXFeedbackEffect {}


    // PLAYER
    var Player: PlayerFactory;

    interface PlayerFactory {
        new(url?: string, onload?: Function): Player;
        (url?: string, onload?: Function): Player;
    }

    interface Player extends Source {
        duration: number;
        loop: boolean;
        loopEnd: number;
        loopStart: number;
        retrigger: boolean;
        load(url: string, callback?: Function): void;
        onended(): void;
        setBuffer(buffer: AudioBuffer);
        setPlaybackRate(rate: number, rampTime?: Tone.Time): void;
        start(startTime?: Tone.Time, offset?: Tone.Time, duration?: Tone.Time): void;
    }


    // PulseOscillator
    var PulseOscillator: PulseOscillatorFactory;

    interface PulseOscillatorFactory {
        new(frequency?: number): PulseOscillator;
        (width?: number): PulseOscillator;
    }

    interface PulseOscillator extends Source {
        detune: Tone.Signal;
        frequency: Tone.Signal;
        state: Tone.Source.State;
        width: Tone.Signal;
        setWidth(width: number): void;
    }


    // SCALE
    var Scale: ScaleFactory;

    interface ScaleFactory {
        new(inputMin: number, inputMax: number, outputMin: number, outputMax: number): Scale;
        (inputMin: number, inputMax: number, outputMin: number, outputMax: number): Scale;
    }

    interface Scale extends Tone {
        //TODO
    }


    // StereoXFeedbackEffect
    var StereoXFeedbackEffect: StereoXFeedbackEffectFactory;

    interface StereoXFeedbackEffectFactory {
        new(): StereoXFeedbackEffect;
        (): StereoXFeedbackEffect;
    }

    interface StereoXFeedbackEffect extends FeedbackEffect {}



    // TRANSPORT
    var Transport: TransportFactory;

    interface TransportFactory {
        new(): Transport;
        (): Transport;
    }

    interface Transport extends Tone {
        loop: boolean;
        state: TransportState;

        clearInterval(rmInterval: number): boolean;
        clearIntervals(): void;
        clearTimeline(timelineID: number): boolean;
        clearTimelines(): void;
        clearTimeout(timeoutID: number): boolean;
        clearTimeouts(): void;
        getBpm(): number;
        getTimeSignature(): number;
        getTransportTime(): string;
        pause(time: Tone.Time): void;
        setBpm(bpm: number, rampTime?: Tone.Time): void;
        setInterval(callback: Function, interval: Tone.Time, ctx: Object): number;
        setLoopEnd(endPosition: Tone.Time): void;
        setLoopPoints(startPosition: Tone.Time, endPosition: Tone.Time): void;
        setLoopStart(startPosition: Tone.Time): void;
        setTimeline(callback: Function, timeout: Tone.Time, ctx: Object): number;
        setTimeout(callback: Function, time: Tone.Time, ctx: Object): number;
        setTimeSignature(numerator: number, denominator?: number): void;
        setTransportTime(progress: Tone.Time): void;
        start(time: Tone.Time): void;
        stop(time: Tone.Time): void;
        syncSignal(signal: Tone.Signal): void;
        syncSource(source: Tone.Source, delay: Tone.Time): void;
        toTicks(time: Tone.Time): number;
        unsyncSource(source: Tone.Source): void;
    }
}

interface TransportState {}
