// Test audio for ui-regressions: small WAV files made in code (no fixtures on disk).

/** 1 s, 220 Hz sine, 16-bit mono 44.1 kHz WAV bytes. */
export const sineWav = () => {
  const frames = 44100,
    b = Buffer.alloc(44 + frames * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + frames * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24);
  b.writeUInt32LE(88200, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / 44100) * 20000), 44 + i * 2);
  return [...b];
};
/** `seconds` of a decaying 330 Hz sine (asymmetric: a reversed waveform looks different). */
export const decayWav = (seconds: number) => {
  const frames = Math.round(44100 * seconds),
    b = Buffer.alloc(44 + frames * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + frames * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24);
  b.writeUInt32LE(88200, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    b.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * 330 * i) / 44100) * Math.exp((-3 * i) / frames) * 20000),
      44 + i * 2,
    );
  return b;
};
/** `seconds` of quiet noise (±0.2, a fixed LCG) with a loud 3 ms 2205 Hz burst at `at` seconds, as
 * 16-bit mono 44.1 kHz WAV: the noise shows if a waveform fills its row, the burst where it is. */
export const burstWav = (seconds: number, at: number) => {
  let seed = 1;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 2 ** 32 - 0.5) * 0.4;
  };
  const frames = Math.round(44100 * seconds),
    b = Buffer.alloc(44 + frames * 2),
    from = Math.round(at * 44100),
    to = from + 132;
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + frames * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24);
  b.writeUInt32LE(88200, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    b.writeInt16LE(
      Math.round(
        (i >= from && i < to ? Math.sin((2 * Math.PI * 2205 * i) / 44100) * 0.92 : noise()) * 32767,
      ),
      44 + i * 2,
    );
  return b;
};
