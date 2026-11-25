// 16-bit PCM WAV encoding (v1 Recorder's "Download Recording" exported a WAV through RecorderJS).
export function encodeWav(buf: AudioBuffer): ArrayBuffer {
  const ch = Math.min(2, buf.numberOfChannels),
    lengthValue = buf.length,
    out = new DataView(new ArrayBuffer(44 + lengthValue * ch * 2));
  const str = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) out.setUint8(offset + i, text.charCodeAt(i));
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
  const data = Array.from({ length: ch }, (_, channel) => buf.getChannelData(channel));
  for (let i = 0, offset = 44; i < lengthValue; i++)
    for (let channel = 0; channel < ch; channel++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, data[channel][i]));
      out.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
  return out.buffer;
}
