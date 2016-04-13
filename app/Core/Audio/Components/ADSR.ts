export class ADSR {

	gainNode: GainNode;
	ctx: AudioContext;

	constructor() {
		this.ctx = (<any>Tone).context;
		this.gainNode = this.ctx.createGain();
		this.gainNode.gain.value = 0.001;
	}

	start(a: number = 0.1, d: number = 0.1, s: number = 1, volume: number = 1, time = this.ctx.currentTime){
		this.gainNode.gain.cancelScheduledValues(0);
		this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, time);
		this.gainNode.gain.linearRampToValueAtTime(volume, time + a);
		this.gainNode.gain.linearRampToValueAtTime(volume * s, time + a + d);
	}

	stop(r: number = 0.1, time = this.ctx.currentTime) {
		this.gainNode.gain.cancelScheduledValues(0);
		this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, time);
		this.gainNode.gain.linearRampToValueAtTime(0, time + r);
	}

	connect(destination: AudioNode) {
		this.gainNode.connect(destination);
	}
}
