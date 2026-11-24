// Perceptual audio descriptors for v1 ↔ v2 parity (SPEC-AUDIO-V1-PARITY). Pure TS, deterministic, no dependencies.
// Exact hashes guard v2 against itself; these guard "sounds like v1", where bit-exactness is impossible (Chromium's
// native nodes, and v1 graphs that are themselves non-deterministic, e.g. Freeverb's feedback loops).
import type { Audio } from './wav.ts';

export interface Descriptors {
  rmsDb: number; // whole render after `skip`, mid channel
  peak: number;
  centroidHz: number; // spectral centroid of the average spectrum
  f0Hz: number | null; // fundamental: strongest line, moved down to a sub-harmonic line when one is present; null for noise
  bandsDb: number[]; // 1/3-octave band levels relative to the loudest band (dB), 50 Hz … 16 kHz
  envelopeDb: number[]; // RMS per 50 ms frame (dB, floor -90)
  sideDb: number; // side/mid energy ratio (dB), -90 for mono
}

export const BAND_CENTRES = Array.from({ length: 26 }, (_, i) => 50 * 2 ** (i / 3)); // 50 Hz … ~15.9 kHz

const db = (x: number) => (x > 1e-9 ? 10 * Math.log10(x) : -90);

function fft(re: Float64Array, im: Float64Array) {
  // in-place radix-2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len,
      wr = Math.cos(a),
      wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1,
        ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k],
          ui = im[i + k],
          vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci,
          vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/** Average power spectrum (Hann, N-point frames, 50% overlap). */
function powerSpectrum(x: Float32Array, n: number): Float64Array {
  const p = new Float64Array(n / 2 + 1);
  let frames = 0;
  const re = new Float64Array(n),
    im = new Float64Array(n);
  for (let s = 0; s + n <= x.length; s += n / 2, frames++) {
    for (let i = 0; i < n; i++) {
      re[i] = x[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= n / 2; k++) p[k] += re[k] * re[k] + im[k] * im[k];
  }
  if (frames) for (let k = 0; k < p.length; k++) p[k] /= frames;
  return p;
}

export function describe(a: Audio, skipSeconds = 0.05): Descriptors {
  const sr = a.sampleRate,
    skip = Math.round(skipSeconds * sr);
  const L = a.channels[0],
    R = a.channels[1] ?? a.channels[0];
  const n = L.length - skip;
  const mid = new Float32Array(n),
    side = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    mid[i] = (L[skip + i] + R[skip + i]) / 2;
    side[i] = (L[skip + i] - R[skip + i]) / 2;
  }
  let e = 0,
    es = 0,
    peak = 0;
  for (let i = 0; i < n; i++) {
    e += mid[i] * mid[i];
    es += side[i] * side[i];
    peak = Math.max(peak, Math.abs(L[skip + i]), Math.abs(R[skip + i]));
  }

  const N = 8192,
    ps = powerSpectrum(mid, N),
    hz = (k: number) => (k * sr) / N;
  let tot = 0,
    wsum = 0;
  for (let k = 1; k < ps.length; k++) {
    tot += ps[k];
    wsum += ps[k] * hz(k);
  }
  const bands = BAND_CENTRES.map((c) => {
    const lo = c / 2 ** (1 / 6),
      hi = c * 2 ** (1 / 6);
    let s = 0;
    for (let k = Math.ceil((lo * N) / sr); k <= Math.floor((hi * N) / sr) && k < ps.length; k++)
      s += ps[k];
    return s;
  });
  const maxBand = Math.max(...bands);
  // f0: strongest bin in a fine spectrum (65536 points over the middle of the render), parabolic interpolation.
  // Reported only for tonal signals (peak bin carries a meaningful share of the energy).
  const M = 1 << 16,
    seg = mid.length >= M ? mid.subarray((mid.length - M) >> 1, ((mid.length - M) >> 1) + M) : mid;
  const fine = powerSpectrum(
    seg.length === M ? seg : Float32Array.from({ length: M }, (_, i) => seg[i] ?? 0),
    M,
  );
  let kmax = 1;
  let ftot = 0;
  for (let k = 1; k < fine.length; k++) {
    ftot += fine[k];
    if (fine[k] > fine[kmax]) kmax = k;
  }
  let f0: number | null = null;
  // Tonal only: a line must stand ≥ 40 dB above the median of its own neighbourhood (±64 bins ≈ ±47 Hz). Noise,
  // even strongly coloured noise, has no such lines; tones do.
  const localMedian = (k: number) =>
    Float64Array.from(fine.subarray(Math.max(1, k - 64), Math.min(fine.length, k + 65))).sort()[64];
  const median = localMedian(kmax);
  if (kmax > 1 && kmax < fine.length - 1 && ftot > 0 && fine[kmax] > median * 1e4) {
    const [a1, b1, c1] = [
      Math.log(fine[kmax - 1] + 1e-30),
      Math.log(fine[kmax] + 1e-30),
      Math.log(fine[kmax + 1] + 1e-30),
    ];
    const d = (a1 - c1) / (2 * (a1 - 2 * b1 + c1));
    let k0 = kmax + d;
    // The strongest line can be a harmonic (e.g. a filter boosting 2·f0): prefer the lowest sub-harmonic k0/m that is
    // itself a clear line (within 30 dB of the strongest and 40 dB above the median).
    for (let m = 6; m >= 2; m--) {
      const c = Math.round(k0 / m);
      if (c < 2) continue;
      let best = c;
      for (let j = c - 2; j <= c + 2; j++) if (fine[j] > fine[best]) best = j;
      if (fine[best] > fine[kmax] * 1e-3 && fine[best] > localMedian(best) * 1e4) {
        const [p1, q1, r1] = [
          Math.log(fine[best - 1] + 1e-30),
          Math.log(fine[best] + 1e-30),
          Math.log(fine[best + 1] + 1e-30),
        ];
        k0 = best + (p1 - r1) / (2 * (p1 - 2 * q1 + r1));
        break;
      }
    }
    f0 = +((k0 * sr) / M).toFixed(3);
  }
  const frame = Math.round(0.05 * sr),
    env: number[] = [];
  for (let s = 0; s + frame <= n; s += frame) {
    let f = 0;
    for (let i = 0; i < frame; i++) f += mid[s + i] * mid[s + i];
    env.push(+db(f / frame).toFixed(2));
  }
  return {
    rmsDb: +db(e / Math.max(n, 1)).toFixed(3),
    peak: +peak.toFixed(6),
    centroidHz: +(tot ? wsum / tot : 0).toFixed(1),
    f0Hz: f0,
    bandsDb: bands.map((b) => +(maxBand > 0 ? db(b / maxBand) : -90).toFixed(2)),
    envelopeDb: env,
    sideDb: +(e > 0 ? db(es / e) : -90).toFixed(2),
  };
}

export interface Thresholds {
  rmsDb: number;
  centroidPct: number;
  f0Cents: number;
  bandDb: number;
  bandFloorDb: number;
  envelopeDb: number;
  envelopeFloorDb: number;
  sideDb: number;
}

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

/** Distances between a v2 render and a v1 reference; `spread` (from v1's own run-to-run variation) widens each limit. */
export function compare(
  v2: Descriptors,
  v1: Descriptors,
  t: Thresholds,
  spread?: Partial<Record<keyof Thresholds, number>>,
) {
  const s = (k: keyof Thresholds) => t[k] + (spread?.[k] ?? 0);
  const bandIdx = v1.bandsDb
    .map((b, i) => [b, i] as const)
    .filter(([b]) => b > -t.bandFloorDb)
    .map(([, i]) => i);
  const bandDelta = Math.max(0, ...bandIdx.map((i) => Math.abs(v2.bandsDb[i] - v1.bandsDb[i])));
  const envIdx = v1.envelopeDb
    .map((v, i) => [v, i] as const)
    .filter(([v]) => v > v1.rmsDb - t.envelopeFloorDb)
    .map(([, i]) => i);
  const envDelta = Math.max(
    0,
    ...envIdx.map((i) => Math.abs((v2.envelopeDb[i] ?? -90) - v1.envelopeDb[i])),
  );
  const m = {
    rmsDb: Math.abs(v2.rmsDb - v1.rmsDb),
    centroidPct: v1.centroidHz
      ? (100 * Math.abs(v2.centroidHz - v1.centroidHz)) / v1.centroidHz
      : 0,
    f0Cents: v1.f0Hz && v2.f0Hz ? Math.abs(cents(v2.f0Hz, v1.f0Hz)) : v1.f0Hz ? Infinity : 0,
    bandDb: bandDelta,
    envelopeDb: envDelta,
    sideDb: v1.sideDb < -60 && v2.sideDb < -60 ? 0 : Math.abs(v2.sideDb - v1.sideDb),
  };
  const fails = (Object.keys(m) as (keyof typeof m)[]).filter((k) => !(m[k] <= s(k)));
  return {
    metrics: Object.fromEntries(
      Object.entries(m).map(([k, v]) => [k, Number.isFinite(v) ? +v.toFixed(3) : v]),
    ),
    fails,
    pass: fails.length === 0,
  };
}

/** Run-to-run spread of v1 itself, in the same units as the thresholds (max pairwise distance). */
export function spreadOf(runs: Descriptors[], t: Thresholds) {
  const out: Partial<Record<keyof Thresholds, number>> = {};
  const zero = { ...t, rmsDb: 0, centroidPct: 0, f0Cents: 0, bandDb: 0, envelopeDb: 0, sideDb: 0 };
  for (let i = 0; i < runs.length; i++)
    for (let j = 0; j < runs.length; j++)
      if (i !== j) {
        const { metrics } = compare(runs[i], runs[j], zero);
        for (const [k, v] of Object.entries(metrics))
          if (Number.isFinite(v as number))
            out[k as keyof Thresholds] = Math.max(out[k as keyof Thresholds] ?? 0, v as number);
      }
  return out;
}
