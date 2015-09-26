/**
 * Adapted for Blokdust and Typescript by Luke Phillips. Inspiration from Chris Wilson's Jungle which can be found here:
 * https://github.com/cwilso/Audio-Input-Effects/blob/master/js/jungle.js
 */

import {IApp} from '../../../IApp';

declare var App: IApp;

export class PitchShifter {

    private previousPitch: number = -1;

    private delayTime: number = 0.1;

    public static get FADE_TIME(): number {
        return 0.05;
    }

    public static get BUFFER_TIME(): number {
        return 0.1;
    }

    private shiftDownBuffer: AudioBuffer;
    private shiftUpBuffer: AudioBuffer;
    private context: AudioContext;

    public input: GainNode;
    public output: GainNode;

    private bufferSources: AudioBufferSourceNode[] = [];

    private modGains: GainNode[] = [];

    private delayGains: GainNode[] = [];

    private delays: any[] = []; //Should be type DelayNode but typescript doesn't like it

    private fadeBufferSources: AudioBufferSourceNode[] = [];

    private mixGains: any[] = []; //Should be type GainNode but typescript doesn't like it


    constructor(context){
        this.context = context;
        // Create nodes for the input and output of this "module".
        this.input = this.context.createGain();
        this.output = this.context.createGain();

        for (let i = 0; i < 4; i++){
            this.bufferSources.push(this.context.createBufferSource());
        }

        this.shiftDownBuffer = this.createDelayTimeBuffer(false);
        this.shiftUpBuffer = this.createDelayTimeBuffer(true);

        this.bufferSources.forEach((bufferSource: AudioBufferSourceNode, i: number) => {
            bufferSource.buffer = i < 2 ? this.shiftDownBuffer : this.shiftUpBuffer;
            bufferSource.loop = true;
        });

        // for switching between oct-up and oct-down
        for (let i = 0; i < 4; i++){
            this.modGains.push(this.context.createGain());
            this.bufferSources[i].connect(this.modGains[i])
        }

        this.modGains.forEach((modGain: GainNode, i: number) => {
            modGain.gain.value = i < 2 ? 1 : 0;
        });

        for (let i = 0; i < 2; i++){
            this.delayGains.push(this.context.createGain());
            this.delays.push(this.context.createDelay());
            this.delayGains[i].connect(this.delays[i].delayTime);
        }

        for (let i = 0; i < 4; i++) {
            if (i % 2 === 0){
                this.modGains[i].connect(this.delayGains[0])
            } else {
                this.modGains[i].connect(this.delayGains[1])
            }
        }

        var fadeBuffer: AudioBuffer = this.createFadeBuffer();

        // Connect processing graph.
        for (let i = 0; i < 2; i++){
            this.fadeBufferSources.push(this.context.createBufferSource());
            this.fadeBufferSources[i].buffer = fadeBuffer;
            this.fadeBufferSources[i].loop = true;

            this.mixGains.push(this.context.createGain());
            this.mixGains[i].gain.value = 0;

            this.fadeBufferSources[i].connect(this.mixGains[i].gain);

            this.input.connect(this.delays[i]);
            this.delays[i].connect(this.mixGains[i]);
            this.mixGains[i].connect(this.output);

        }

        // Start
        var t = this.context.currentTime + 0.050;
        var t2 = t + PitchShifter.BUFFER_TIME - PitchShifter.FADE_TIME;
        this.bufferSources[0].start(t);
        this.bufferSources[1].start(t2);
        this.bufferSources[2].start(t);
        this.bufferSources[3].start(t2);
        this.fadeBufferSources[0].start(t);
        this.fadeBufferSources[1].start(t2);

        this.setDelay(this.delayTime);
    }

    private setDelay(delayTime): void {
        this.delayGains.forEach((delayGain: GainNode) => {
            delayGain.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
        });
    }

    public get PitchOffset(): number {
        return this.previousPitch;
    }

    public set PitchOffset(multiplier: number) {
        if (multiplier>0) { // pitch up

            this.modGains.forEach((modGain: GainNode, i: number) => {
                modGain.gain.value = i < 2 ? 0 : 1;
            });

        } else { // pitch down

            this.modGains.forEach((modGain: GainNode, i: number) => {
                modGain.gain.value = i < 2 ? 1 : 0;
            });
        }
        this.setDelay(this.delayTime * Math.abs(multiplier));
        this.previousPitch = multiplier;
    }

    private createFadeBuffer(): AudioBuffer {
        const length1: number = PitchShifter.BUFFER_TIME * this.context.sampleRate;
        const length2: number = (PitchShifter.BUFFER_TIME - 2 * PitchShifter.FADE_TIME) * this.context.sampleRate;
        const length: number = length1 + length2;
        var buffer: AudioBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
        var p: any = buffer.getChannelData(0);

        var fadeLength = PitchShifter.FADE_TIME * this.context.sampleRate;

        var fadeIndex1 = fadeLength;
        var fadeIndex2 = length1 - fadeLength;

        // 1st part of cycle
        for (var i = 0; i < length1; ++i) {
            var value;

            if (i < fadeIndex1) {
                value = Math.sqrt(i / fadeLength);
            } else if (i >= fadeIndex2) {
                value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
            } else {
                value = 1;
            }

            p[i] = value;
        }

        // 2nd part
        for (var i = length1; i < length; ++i) {
            p[i] = 0;
        }


        return buffer;
    }

    private createDelayTimeBuffer(shiftUp): AudioBuffer {
        const length1: number = PitchShifter.BUFFER_TIME * this.context.sampleRate;
        const length2: number = (PitchShifter.BUFFER_TIME - 2 * PitchShifter.FADE_TIME) * this.context.sampleRate;
        const length: number = length1 + length2;
        const buffer: AudioBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
        let p: any = buffer.getChannelData(0);

        // 1st part of cycle
        for (let i = 0; i < length1; ++i) {
            if (shiftUp)
            // This line does shift-up transpose
                p[i] = (length1-i)/length;
            else
            // This line does shift-down transpose
                p[i] = i / length1;
        }

        // 2nd part
        for (var i = length1; i < length; ++i) {
            p[i] = 0;
        }

        return buffer;
    }

    connect(unit, outputNum?, inputNum?) {
        if (Array.isArray(this.output)){
            outputNum = outputNum ? outputNum : 0;
            this.output[outputNum].connect(unit, 0, inputNum);
        } else {
            this.output.connect(unit, outputNum, inputNum);
        }
        return this;
    }

    disconnect(outputNum?) {
        if (Array.isArray(this.output)){
            outputNum = outputNum ? outputNum : 0;
            this.output[outputNum].disconnect();
        } else {
            this.output.disconnect();
        }
        return this;
    }

    toMaster(){
        this.connect(App.Audio.Master);
        return this;
    }
}

