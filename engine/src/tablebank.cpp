// The Wavetable block's built-in tables (CHG-0031, AUDIO-0004): every frame is a spectrum made here
// from maths, then band-limited per octave by the Tone's deterministic inverse FFT. Nothing is
// sampled or stored (DATA-0005).
#include "blokdust/tablebank.hpp"

#include <algorithm>
#include <cmath>
#include <complex>
#include <cstdint>

#include "blokdust/dmath.hpp"
#include "blokdust/wavetable.hpp"

namespace blokdust::dsp {
namespace {

using cplx = std::complex<double>;

/// Twiddles for every transform here (≤ 4096 points), made once.
const std::vector<cplx>& twiddles() {
  static const std::vector<cplx> t = fftTwiddles(4096);
  return t;
}
constexpr int kH = TableBank::kMaxPartials;

enum : int { kBell, kChime, kGlass, kGong, kVoice, kSweep, kSync, kFold, kPwm };
constexpr std::array<const char*, TableBank::kTables> kNames = {
    "BELL", "CHIME", "GLASS", "GONG", "VOICE", "SWEEP", "SYNC", "FOLD", "PULSE"};
// Note cycles per table cycle: the inharmonic tables put their partials at h / period of the note.
constexpr std::array<int, TableBank::kTables> kPeriod = {20, 8, 48, 24, 1, 1, 1, 1, 1};

/// A fixed phase per harmonic (splitmix64 of h and a salt): spreads a dense spectrum's peaks so its
/// level holds up.
double phaseOf(int h, std::uint64_t salt) {
  std::uint64_t z = static_cast<std::uint64_t>(h) * 0x9E3779B97F4A7C15ull + salt;
  z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ull;
  z = (z ^ (z >> 27)) * 0x94D049BB133111EBull;
  z ^= z >> 31;
  return static_cast<double>(z >> 11) * (1.0 / 9007199254740992.0) * dmath::kTwoPi;
}

/// Adds a partial at `ratio` × the note (table harmonic round(ratio · period)), amplitude `a`, sine
/// phase `ph`.
void partial(std::vector<cplx>& c, int period, double ratio, double a, double ph) {
  const auto h = static_cast<int>(std::lround(ratio * period));
  if (h < 1 || h > kH || a == 0.0)
    return;
  c[static_cast<std::size_t>(h)] += a * cplx(dmath::cos(ph), dmath::sin(ph));
}

/// Forward FFT through the inverse one: X = conj(IFFT(conj(x))).
void forwardFft(std::vector<cplx>& a) {
  for (auto& v : a)
    v = std::conj(v);
  inverseFft(a, twiddles());
  for (auto& v : a)
    v = std::conj(v);
}

/// The harmonics of a waveform drawn in the time domain (one cycle at 4096 points, 8× the 512 kept,
/// so even a saw's own aliasing stays below −70 dB).
template <class F>
void fromCycle(std::vector<cplx>& c, F&& wave) {
  constexpr int m = 4096;
  std::vector<cplx> x(m);
  for (int i = 0; i < m; ++i)
    x[static_cast<std::size_t>(i)] = cplx(wave(static_cast<double>(i) / m), 0.0);
  forwardFft(x);
  // x[i] = Σ a sin(2π h i/M + φ) gives X[h] = −i·M·a·e^{iφ}/2, so a·e^{iφ} = X[h]·2i/M.
  for (int h = 1; h <= kH; ++h)
    c[static_cast<std::size_t>(h)] = x[static_cast<std::size_t>(h)] * cplx(0.0, 2.0 / m);
}

/// Interpolates a row of values at p in 0–1 across evenly spaced keys.
template <std::size_t N>
double across(const std::array<double, N>& keys, double p) {
  const double x = std::clamp(p, 0.0, 1.0) * static_cast<double>(N - 1);
  const auto i = std::min(static_cast<std::size_t>(x), N - 2);
  return keys[i] + (x - static_cast<double>(i)) * (keys[i + 1] - keys[i]);
}

/// Frame `p` (0–1) of `table`: c[h] = amplitude · e^{iφ} of harmonic h (sine phase), h = 1 … 512.
void spectrum(int table, double p, std::vector<cplx>& c) {
  std::fill(c.begin(), c.end(), cplx(0.0, 0.0));
  const int per = kPeriod[static_cast<std::size_t>(table)];
  switch (table) {
    case kBell: {
      // A church bell's partials over its strike (the prime is the note): hum, prime, the
      // minor-third tierce, quint, nominal, and the upper partials. Position is time after the
      // strike: the higher a partial, the sooner it dies, until the hum and prime are left.
      constexpr double kParts[][2] = {{0.5, 0.55}, {1.0, 0.7},  {1.2, 0.9},   {1.5, 0.4},
                                      {2.0, 1.0},  {2.5, 0.45}, {2.65, 0.5},  {3.0, 0.35},
                                      {4.0, 0.3},  {4.2, 0.18}, {5.35, 0.22}, {6.0, 0.12},
                                      {6.65, 0.1}, {8.0, 0.08}, {9.35, 0.05}};
      for (const auto& q : kParts)
        partial(c, per, q[0], q[1] * dmath::exp(-p * 2.2 * q[0]),
                phaseOf(static_cast<int>(q[0] * per), 11));
      break;
    }
    case kChime: {
      // A free metal bar (tubular chime, glockenspiel): modes at 1, 2.76, 5.40, 8.93, 13.34, 18.64
      // × the note. Position is the mallet: soft (the fundamental) to hard (bright upper modes).
      constexpr double kModes[] = {1.0, 2.756, 5.404, 8.933, 13.344, 18.638};
      const double slope = 2.4 - 2.0 * p;
      for (double r : kModes)
        partial(c, per, r, dmath::pow(r, -slope), phaseOf(static_cast<int>(r * per), 23));
      break;
    }
    case kGlass: {
      // A singing bowl or rubbed glass: each mode is a close pair, so it beats (the pair 1/48 of
      // the note apart, wider for higher modes). Position goes from a soft rub (the fundamental, a
      // gentle beat) to a ringing strike.
      constexpr double kModes[][2] = {{1.0, 1.0}, {2.71, 0.5}, {5.15, 0.28}, {8.27, 0.14}};
      for (int i = 0; i < 4; ++i) {
        const double r = kModes[i][0], a = kModes[i][1] * (i == 0 ? 1.0 : 0.15 + 0.85 * p);
        const double split = (i + 1.0) / per, partner = 0.3 + 0.7 * p;
        partial(c, per, r, a, phaseOf(i, 31));
        partial(c, per, r + split, a * partner, phaseOf(i + 8, 31));
      }
      break;
    }
    case kGong: {
      // A circular plate's modes (the membrane's Bessel ratios). Position goes from a drum (the low
      // modes) to a gong (every mode, and a wash of close partials above them).
      constexpr double kModes[] = {1.000, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156,
                                   3.501, 3.600, 3.652, 4.060, 4.154, 4.601, 4.832,
                                   4.903, 5.131, 5.412, 5.977, 6.209, 6.528};
      const double slope = 2.6 - 2.0 * p;
      for (double r : kModes)
        partial(c, per, r, dmath::pow(r, -slope), phaseOf(static_cast<int>(r * per), 41));
      for (int h = 7 * per; h <= 13 * per;
           h += 3) {  // the wash: every third harmonic, uneven levels
        const double r = static_cast<double>(h) / per,
                     a = 0.12 * p * p * (0.4 + 0.6 * phaseOf(h, 43) / dmath::kTwoPi) *
                         dmath::pow(r / 7.0, -1.5);
        partial(c, per, r, a, phaseOf(h, 47));
      }
      break;
    }
    case kVoice: {
      // A sung vowel: a buzz shaped by the formants of U, O, A, E, I (Peterson & Barney's men),
      // sliding between them; laid out for a 110 Hz voice.
      constexpr std::array<double, 5> f1 = {300, 570, 730, 530, 270},
                                      f2 = {870, 840, 1090, 1840, 2290},
                                      f3 = {2240, 2410, 2440, 2480, 3010};
      const double fs[4] = {across(f1, p), across(f2, p), across(f3, p), 3400.0};
      constexpr double kBw[4] = {80.0, 100.0, 150.0, 250.0}, kGain[4] = {1.0, 0.7, 0.35, 0.15};
      for (int h = 1; h <= 60; ++h) {
        const double f = 110.0 * h;
        double env = 0.0;
        for (int j = 0; j < 4; ++j) {
          const double d = (f - fs[j]) / kBw[j];
          env += kGain[j] / (1.0 + d * d);
        }
        partial(c, per, h, env * dmath::pow(h, -0.6), 0.0);
      }
      break;
    }
    case kSweep: {
      // One loud harmonic over a quiet buzz, climbing from the 2nd to the 32nd: overtone singing, a
      // resonant sweep.
      const double centre = 1.0 + 4.0 * p;  // log2 of the harmonic
      for (int h = 1; h <= 64; ++h) {
        const double d = (dmath::log2(h) - centre) / 0.12;
        partial(c, per, h, 0.3 / h + dmath::exp(-d * d), 0.0);
      }
      break;
    }
    case kSync: {
      // A saw hard-synced to the note, its own pitch rising 3 octaves (1 → 8 ×): the classic
      // digital sweep.
      const double ratio = dmath::exp2(3.0 * p);
      fromCycle(c, [ratio](double t) {
        const double s = t * ratio;
        return 2.0 * (s - std::floor(s)) - 1.0;
      });
      break;
    }
    case kFold: {
      // A sine folded back on itself harder and harder (sin of a louder sine): a West Coast
      // wavefolder.
      const double gain = 1.0 + 9.0 * p;
      fromCycle(c, [gain](double t) {
        return dmath::sin(0.5 * dmath::kPi * gain * dmath::sin(dmath::kTwoPi * t));
      });
      break;
    }
    case kPwm:
    default: {
      // A pulse narrowing from square (50 %) to a click (2 %).
      const double w = 0.5 - 0.48 * p;
      for (int h = 1; h <= kH; ++h)
        partial(c, per, h, 2.0 / (dmath::kPi * h) * dmath::sin(dmath::kPi * h * w),
                0.5 * dmath::kPi);
      break;
    }
  }
}

unsigned bandHarmonics(int b) {
  return static_cast<unsigned>(kH) >> b;
}
unsigned bandLength(int b) {
  return std::max(64u, 4u * bandHarmonics(b));
}

/// One cycle of harmonics 1 … `top` of `c` at `len` points (unnormalised).
void synth(const std::vector<cplx>& c, unsigned top, unsigned len, std::vector<cplx>& work,
           float* out, double scale) {
  work.assign(len, cplx(0.0, 0.0));
  for (unsigned h = 1; h <= top && h < len / 2; ++h) {
    // x[i] = Σ a sin(2π h i/N + φ): spectrum −i·a·e^{iφ}/2 at +h and its conjugate at −h.
    const cplx v = c[h] * cplx(0.0, -0.5);
    work[h] = v;
    work[len - h] = std::conj(v);
  }
  inverseFft(work, twiddles());
  for (unsigned i = 0; i < len; ++i)
    out[i] = static_cast<float>(work[i].real() * scale);
}

/// One frame, every band, each frame scaled by its band-0 (all harmonics) peak so each peaks at 1.
/// `out[b]` points at band b's samples.
void makeFrame(const std::vector<cplx>& c, std::vector<cplx>& work, float* const* out, int bands) {
  synth(c, bandHarmonics(0), bandLength(0), work, out[0], 1.0);
  double peak = 0.0;
  for (unsigned i = 0; i < bandLength(0); ++i)
    peak = std::max(peak, static_cast<double>(std::abs(out[0][i])));
  const double scale = peak > 0.0 ? 1.0 / peak : 1.0;
  for (unsigned i = 0; i < bandLength(0); ++i)
    out[0][i] = static_cast<float>(out[0][i] * scale);
  for (int b = 1; b < bands; ++b)
    synth(c, bandHarmonics(b), bandLength(b), work, out[b], scale);
}

double framePosition(int f) {
  return static_cast<double>(f) / (TableBank::kFrames - 1);
}

}  // namespace

const std::array<const char*, TableBank::kTables>& TableBank::names() noexcept {
  return kNames;
}
int TableBank::period(int table) noexcept {
  return kPeriod[static_cast<std::size_t>(std::clamp(table, 0, kTables - 1))];
}

TableBank::TableBank(double sampleRate) : nyquist_(sampleRate * 0.5) {
  unsigned off = 0;
  for (int b = 0; b < kBands; ++b) {
    bandLen_[static_cast<std::size_t>(b)] = bandLength(b);
    bandOffset_[static_cast<std::size_t>(b)] = off;
    off += bandLength(b);
  }
  frameStride_ = off;
  data_.assign(static_cast<std::size_t>(kTables) * kFrames * frameStride_, 0.0f);
  std::vector<cplx> c(kH + 1), work;
  std::array<float*, kBands> out{};
  for (int t = 0; t < kTables; ++t) {
    for (int f = 0; f < kFrames; ++f) {
      spectrum(t, framePosition(f), c);
      for (int b = 0; b < kBands; ++b)
        out[static_cast<std::size_t>(b)] =
            data_.data() +
            (static_cast<std::size_t>(t) * kFrames + static_cast<std::size_t>(f)) * frameStride_ +
            bandOffset_[static_cast<std::size_t>(b)];
      makeFrame(c, work, out.data(), kBands);
    }
  }
}

TableBank::Bands TableBank::bands(double tableHz) const noexcept {
  // x ≤ k: band k's top harmonic is under Nyquist. In (k − 1, k] read band k, fading into band k +
  // 1 as x nears k.
  if (!(tableHz > 0.0))
    return {};
  const double x = dmath::log2(tableHz * kMaxPartials / nyquist_);
  if (x < -1.0)
    return {};
  const double fl = std::floor(x);
  const int k = static_cast<int>(fl) + 1;
  if (k >= kBands - 1)
    return {kBands - 1, 0.0};
  return {k, x - fl};
}

TableBank::Read TableBank::read(int table, double position, Bands b) const noexcept {
  table = std::clamp(table, 0, kTables - 1);
  const double x = std::clamp(position, 0.0, 1.0) * (kFrames - 1);
  const int i = std::min(static_cast<int>(x), kFrames - 2);
  const int k = std::clamp(b.k, 0, kBands - 1), k2 = std::min(k + 1, kBands - 1);
  Read r;
  r.a0 = frame(table, i, k);
  r.a1 = frame(table, i + 1, k);
  r.b0 = frame(table, i, k2);
  r.b1 = frame(table, i + 1, k2);
  r.lenA = bandLen_[static_cast<std::size_t>(k)];
  r.lenB = bandLen_[static_cast<std::size_t>(k2)];
  r.frameMix = x - i;
  r.bandMix = b.mix;
  return r;
}

std::vector<float> TableBank::picture(int table, double position, int n, double cycles) {
  table = std::clamp(table, 0, kTables - 1);
  const double x = std::clamp(position, 0.0, 1.0) * (kFrames - 1);
  const int i = std::min(static_cast<int>(x), kFrames - 2);
  const double mix = x - i;
  const unsigned len = bandLength(0);
  std::vector<cplx> c(kH + 1), work;
  std::vector<float> f0(len), f1(len);
  float* p0 = f0.data();
  float* p1 = f1.data();
  spectrum(table, framePosition(i), c);
  makeFrame(c, work, &p0, 1);
  spectrum(table, framePosition(i + 1), c);
  makeFrame(c, work, &p1, 1);
  std::vector<float> out(static_cast<std::size_t>(std::max(0, n)));
  for (int j = 0; j < n; ++j) {
    const double at =
        static_cast<double>(j) / std::max(1, n - 1) * std::clamp(cycles, 0.0, 1.0) * (len - 1);
    const auto a = static_cast<unsigned>(at);
    const unsigned a1 = std::min(a + 1, len - 1);
    const double fr = at - a;
    const double v0 = f0[a] + fr * (f0[a1] - f0[a]), v1 = f1[a] + fr * (f1[a1] - f1[a]);
    out[static_cast<std::size_t>(j)] = static_cast<float>(v0 + mix * (v1 - v0));
  }
  return out;
}

// ---- TableOscillator ----

void TableOscillator::setFrequency(double noteHz, const TableBank& bank,
                                   double sampleRate) noexcept BLOKDUST_NONBLOCKING {
  bank_ = &bank;
  sampleRate_ = sampleRate;
  tableHz_ = std::abs(noteHz) / TableBank::period(table_);
  inc_ = tableHz_ / sampleRate;
  bandsNow_ = bank.bands(tableHz_);
}

double TableOscillator::next(double cents) noexcept BLOKDUST_NONBLOCKING {
  if (cents == 0.0 || !bank_)
    return next();
  const double hz = tableHz_ * dmath::exp2(cents / 1200.0);
  return sample(bank_->bands(hz), hz / sampleRate_);
}

double TableOscillator::sample(TableBank::Bands bands, double inc) noexcept BLOKDUST_NONBLOCKING {
  if (!bank_) {
    advance(inc);
    return 0.0;
  }
  const TableBank::Read r = bank_->read(table_, posNow_, bands);
  const auto at = [this](const float* t, unsigned len) {
    const double fi = phase_ * len;  // lengths are powers of two: exact, so fi < len
    const auto i0 = static_cast<unsigned>(fi);
    const unsigned i1 = (i0 + 1) & (len - 1);
    return t[i0] + (fi - i0) * (t[i1] - t[i0]);
  };
  const double a0 = at(r.a0, r.lenA), a1 = at(r.a1, r.lenA);
  const double a = a0 + r.frameMix * (a1 - a0);
  double v = a;
  if (r.bandMix > 0.0) {
    const double b0 = at(r.b0, r.lenB), b1 = at(r.b1, r.lenB);
    v += r.bandMix * (b0 + r.frameMix * (b1 - b0) - a);
  }
  advance(inc);
  return v;
}

}  // namespace blokdust::dsp
