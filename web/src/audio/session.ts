declare global {
  interface Navigator {
    /** WebKit only (Safari 16.4+). */
    audioSession?: { type: string };
  }
}

/** iOS audio session: "playback" (as music apps) plays with the silent switch on (Safari's "auto"
 * does not); "play-and-record" while a block needs the mic. Set before the AudioContext is made. */
export function setAudioSession(type: 'playback' | 'play-and-record'): void {
  const session = navigator.audioSession;
  if (!session || session.type === type) return;
  try {
    session.type = type;
  } catch {
    /* a browser that rejects the value still plays, just not over the switch */
  }
}
