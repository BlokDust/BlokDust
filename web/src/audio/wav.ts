// 16-bit PCM WAV encoding (v1 Recorder's "Download Recording" exported a WAV through RecorderJS).
export function encodeWav(buf: AudioBuffer): ArrayBuffer {
  const ch = Math.min(2, buf.numberOfChannels),
    lengthValue = buf.length,
    out = new DataView(new ArrayBuffer(44 + lengthValue * ch * 2));
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  out.setUint32(4, 36 + lengthValue * ch * 2, true);
  str(8, 'WAVEfmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, ch, true);
  out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, lengthValue * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  for (let i = 0, o = 44; i < lengthValue; i++)
    for (let c = 0; c < ch; c++, o += 2) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
  return out.buffer;
}
