/**
 * Block Params typing
 */

/**
 *  Source Params
 */
interface GranularParams {
    playbackRate: number;
    density: number;
    region: number;
    spread: number;
    grainlength: number;
    track: string|AudioBuffer;
    trackName: string;
    user: string;
}

interface ToneSourceParams {
    frequency: number;
    waveform: number|string;
    baseFrequency: number;
    fine: number;
}

interface NoiseParams {
    playback: number;
    waveform: number;
}

interface SamplerParams {
    playbackRate: number;
    reverse: boolean;
    startPosition: number;
    endPosition: number;
    loop: boolean;
    loopStart: number;
    loopEnd: number;
    retrigger: boolean;
    volume: number;
    track: string;
    trackName: string;
}

interface SoundcloudParams extends SamplerParams {
    trackName: string;
    user: string;
}

interface MicrophoneParams extends GainParams{
    monitor: boolean;
}

/**
 * Power Params
 */
interface LogicParams {
    logic: boolean;
}

/**
 * Interaction Params
 */
interface KeyboardParams {
    octave: number;
    glide: number;
    isPolyphonic: boolean;
}


/**
 * Post Effect Params
 */
interface AutoWahParams {
    octaves: number;
    baseFrequency: number;
    mix: number;
    attack: number;
    release: number;
}

interface BitCrusherParams extends DryWetParams {
    bits: number;
}

interface ChorusParams extends RateDepthParams {
    delayTime: number;
    feedback: number;
}

interface ChompParams {
    rate: number;
    Q: number;
    gain: number;
}

interface ChopperParams extends RateDepthParams {}

interface ConvolutionParams extends DryWetParams {
    track: string|AudioBuffer;
    trackName: string;
    user: string;
}

interface DelayParams extends DryWetParams {
    delayTime: number;
    feedback: number;
}

interface DistortionParams extends DryWetParams {
    drive: number;
}

interface DryWetParams {
    mix: number;
}

interface EQParams {
    frequency_1: number;
    Q_1: number;
    gain_1: number;
    frequency_2: number;
    Q_2: number;
    gain_2: number;
    frequency_3: number;
    Q_3: number;
    gain_3: number;
    frequency_4: number;
    Q_4: number;
    gain_4: number;
}

interface FilterParams extends GainParams {
    frequency: number;
}

interface GainParams {
    gain: number;
}

interface PhaserParams extends DryWetParams, RateDepthParams {
    baseFrequency: number;
}

interface RateDepthParams {
    rate: number;
    depth: number;
}

interface ReverbParams extends DryWetParams {
    dampening: number;
    roomSize: number;
}



/**
 * PreEffect Params
 */
interface EnvelopeParams {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
}

interface LFOParams extends RateDepthParams {
    waveform: number;
}
interface ScuzzParams extends LFOParams {}

interface PitchShifterParams {
    pitchOffset: number;
}