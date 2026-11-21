/** Tone r6 noteToFrequency ("c#4" → Hz), as v1's SampleGen calls it. */
const NOTE_INDEX: Record<string, number> = { cbb: -2, cb: -1, c: 0, 'c#': 1, cx: 2, dbb: 0, db: 1, d: 2, 'd#': 3, dx: 4, ebb: 2, eb: 3, e: 4, 'e#': 5, ex: 6,
  fbb: 3, fb: 4, f: 5, 'f#': 6, fx: 7, gbb: 5, gb: 6, g: 7, 'g#': 8, gx: 9, abb: 7, ab: 8, a: 9, 'a#': 10, ax: 11, bbb: 9, bb: 10, b: 11, 'b#': 12, bx: 13 };
export function noteToFrequency(note: string): number {
  const parts = note.split(/(-?\d+)/);
  if (parts.length !== 3) return 0;
  return 440 * 2 ** ((NOTE_INDEX[parts[0].toLowerCase()] + (parseInt(parts[1], 10) + 1) * 12 - 69) / 12);
}
