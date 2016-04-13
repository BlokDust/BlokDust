import {ADSR} from './ADSR';

function isUndef(val){
	return val === void 0;
}

// NOISE//
var bufferSize = (<any>Tone).context.sampleRate * 2;
var NoiseBuffer = (<any>Tone).context.createBuffer(1, bufferSize, (<any>Tone).context.sampleRate);
var output = NoiseBuffer.getChannelData(0);
for (let i=0; i<bufferSize; i++) {
	output[i] = (Math.random()*2) - 1;
}

export class BDSimpler {
	input: GainNode;
	output: GainNode;
	envelope: ADSR;
	ctx: AudioContext;
	loop: boolean;
	loopStart: number;
	loopEnd: number;
	reverse: boolean;
	playbackRateSignal: Tone.Signal;
	playbackRate: number;
	sample: AudioBufferSourceNode;
	buffer: any;
	attack: number;
	decay: number;
	sustain: number;
	release: number;

	constructor() {
		this.ctx = (<any>Tone).context;
		this.output = this.ctx.createGain();
	}

	setup() {
		// construct
		this.envelope = new ADSR();
		this.playbackRateSignal = new Tone.Signal(this.playbackRate, (<any>Tone).Type.Positive);
		this.buffer = NoiseBuffer;
		
		// connect
		this.envelope.connect(this.output);
	}

	triggerAttack(offset?, duration?) {
		this.setup();

		var now = this.ctx.currentTime;

		if (this.loop && isUndef(offset)){
			//if it's a loop the default offset is the loopstart point
			offset = this.loopStart;
		} else if (isUndef(offset)){
			//otherwise the default offset is 0
			 offset = 0;
		}

		if (isUndef(duration)){
			duration = this.buffer.duration - offset;
		}

		//make the source
		this.sample = this.ctx.createBufferSource();
		this.sample.buffer = this.buffer;

		//set the looping properties
		if (this.loop){
			this.sample.loop = this.loop;
			this.sample.loopStart = this.loopStart;
			this.sample.loopEnd = this.loopEnd;
		}
		
		// if (Tone.isSafari) {
		// 	this.sample.playbackRate.value = this.playbackRate;
		// } else {
			this.playbackRateSignal.connect(this.sample.playbackRate);
		// }
		this.sample.connect(this.output);
		
		//start it
		if (this.loop){
			this.sample.start(now, offset);
		} else {
			this.sample.start(now, offset, duration);
		}
		this.envelope.start(this.attack, this.decay, this.sustain);
	}

	triggerRelease() {
		this.sample.stop(this.ctx.currentTime + this.release);
		this.envelope.stop(this.release);
	}

	connect(destination: any) {
		this.output.connect(destination);
	}
}