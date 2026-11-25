// A steady test tone as a WAV file's bytes, for tests that attach a sample without a picker.

/** One second of a 220 Hz sine, 16-bit mono at 44.1 kHz, as a WAV file's bytes. */
export function steadySineWav(): number[] {
  const frames = 44100,
    wav = Buffer.alloc(44 + frames * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + frames * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(44100, 24);
  wav.writeUInt32LE(88200, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    wav.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / 44100) * 20000), 44 + i * 2);
  return [...wav];
}
