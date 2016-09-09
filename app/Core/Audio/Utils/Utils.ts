/**
 * returns true if the context is started
 * @return {Boolean}
 */
export function hasAudioContextStarted(context: AudioContext){
	return (context !== null && (context as any).state === "running");
};

/**
 * Pass this function an audio context to check to see if it is unlocked
 * An isUnlocked boolean is passed as a parameter of the callback function
 */
export function unlockAudioContext(context: AudioContext, cb: () => void): void {
	// create empty buffer and play it
	const source = createEmptyBuffer(context);
	// by checking the play state after some time, we know if we're really unlocked
	setTimeout(() => {
		if (((<any>source).playbackState === (<any>source).PLAYING_STATE ||
			(<any>source).playbackState === (<any>source).FINISHED_STATE)) {
			cb();
		}
	}, 1);
}

/**
 * Creates an empty buffer. Useful for unlocking iOS AudioContext
 * @param context
 * @returns {AudioBufferSourceNode}
 */
export function createEmptyBuffer(context: AudioContext): AudioBufferSourceNode {
	const buffer = context.createBuffer(1, 1, 22050);
	const source = context.createBufferSource();
	source.buffer = buffer;
	source.connect(context.destination);
	source.start(context.currentTime);
	source.stop(context.currentTime+0.5);
	return source;
}

export function isIOS() {
	return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}