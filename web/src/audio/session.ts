/** iOS audio session (owner, 2026-11-08: no sound with the silent switch on). Safari's default "auto" session routes
 * a page like a notification sound, which the ringer switch silences. "playback" is what a music app asks for and is
 * honoured over the switch; "play-and-record" while a Microphone / Audio In block needs the mic. WebKit-only
 * (Safari 16.4+): elsewhere `navigator.audioSession` does not exist and nothing needs it. Set "playback" before the
 * AudioContext is created. */
export function setAudioSession(type: 'playback' | 'play-and-record'): void {
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (!session || session.type === type) return;
  try { session.type = type; } catch { /* a browser that rejects the value still plays, just not over the switch */ }
}
