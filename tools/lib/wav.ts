// Minimal WAV (RIFF) read/write for 32-bit float PCM, used by audio reference tools. No dependencies.
import { readFileSync, writeFileSync } from 'node:fs';

export interface Audio {
  sampleRate: number;
  channels: Float32Array[];
}

export function writeWav(path: string, a: Audio) {
  const lengthValue = a.channels[0].length,
    ch = a.channels.length,
    bytes = lengthValue * ch * 4;
  const b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + bytes, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(3, 20);
  b.writeUInt16LE(ch, 22); // 3 = IEEE float
  b.writeUInt32LE(a.sampleRate, 24);
  b.writeUInt32LE(a.sampleRate * ch * 4, 28);
  b.writeUInt16LE(ch * 4, 32);
  b.writeUInt16LE(32, 34);
  b.write('data', 36);
  b.writeUInt32LE(bytes, 40);
  for (let i = 0; i < lengthValue; i++)
    for (let c = 0; c < ch; c++) b.writeFloatLE(a.channels[c][i], 44 + (i * ch + c) * 4);
  writeFileSync(path, b);
}

export function readWav(path: string): Audio {
  const b = readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error(`${path}: not a WAV`);
  let off = 12,
    fmt = 0,
    ch = 0,
    sr = 0,
    bits = 0;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4),
      size = b.readUInt32LE(off + 4),
      body = off + 8;
    if (id === 'fmt ') {
      fmt = b.readUInt16LE(body);
      ch = b.readUInt16LE(body + 2);
      sr = b.readUInt32LE(body + 4);
      bits = b.readUInt16LE(body + 14);
    }
    if (id === 'data') {
      if (fmt !== 3 || bits !== 32) throw new Error(`${path}: only 32-bit float WAV is supported`);
      const n = size / (4 * ch);
      const channels = Array.from({ length: ch }, () => new Float32Array(n));
      for (let i = 0; i < n; i++)
        for (let c = 0; c < ch; c++) channels[c][i] = b.readFloatLE(body + (i * ch + c) * 4);
      return { sampleRate: sr, channels };
    }
    off = body + size + (size & 1);
  }
  throw new Error(`${path}: no data chunk`);
}
