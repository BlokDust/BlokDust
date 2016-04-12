export function simpleTriggerAttack(gainNode: GainNode, a:number = 0.1, d: number = 0.1, s: number = 1) {
	const now = gainNode.context.currentTime;
	gainNode.gain.cancelScheduledValues(0);
	gainNode.gain.setValueAtTime(0, now);
	gainNode.gain.linearRampToValueAtTime(1, now + a);
	gainNode.gain.linearRampToValueAtTime(s, now + a + d);
}

export function simpleTriggerRelease(gainNode: GainNode, r:number = 0.1) {
	const now = gainNode.context.currentTime;
	gainNode.gain.cancelScheduledValues(0);
	gainNode.gain.setValueAtTime(gainNode.gain.value, now);
	gainNode.gain.linearRampToValueAtTime(0, now + r);
}
