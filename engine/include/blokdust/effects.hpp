#pragma once

#include "blokdust/realtime.hpp"
// Core-block DSP (CHG-0002 1.5–1.7): v1's effects as Tone.js r6 composes them, on
// Chromium-equivalent Web Audio primitives (AUDIO-0001). Everything here is allocation-free and
// deterministic (dmath, IEEE basic ops); state is per instance and independent of how calls are
// segmented. Delay memory comes from caller-owned buffers (pools in the engine), never from the
// audio thread.
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <span>

#include "blokdust/dmath.hpp"
#include "blokdust/rng.hpp"
#include "blokdust/wavetable.hpp"

namespace blokdust::dsp {

// ---------------------------------------------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------------------------------------------

/// Tone r6 decibels → gain: 2^(dB/6) (Tone.prototype.dbToGain).
inline double toneDbToGain(double db) noexcept {
  return dmath::exp2(db / 6.0);
}

/// Tone.EqualPowerGain (a WaveShaper of sin(x·π/2), forced to 0 below 0.001): CrossFade gains for
/// `wet`.
struct EqualPower {
  double dry = 0.0, wet = 1.0;
  void set(double w) noexcept {
    w = std::clamp(w, 0.0, 1.0);
    const auto g = [](double x) {
      return std::abs(x) < 0.001 ? 0.0 : dmath::sin(x * dmath::kPi / 2.0);
    };
    wet = g(w);
    dry = g(1.0 - w);
  }
};

/// Chromium blink::Biquad (biquad.cc): Web Audio BiquadFilterNode coefficient formulas, normalised
/// frequency f/nyquist, lowpass/highpass Q in dB, shelves ignore Q. Direct form I.
class Biquad {
 public:
  enum class Type : std::uint8_t {
    Lowpass,
    Highpass,
    Bandpass,
    Lowshelf,
    Highshelf,
    Peaking,
    Notch,
    Allpass
  };
  void set(Type t, double hz, double q, double gainDb, double sampleRate) noexcept {
    const double f = hz / (sampleRate * 0.5);
    switch (t) {
      case Type::Lowpass:
      case Type::Highpass: {
        const double c = std::clamp(f, 0.0, 1.0);
        if (c == 1.0) {
          t == Type::Lowpass ? norm(1, 0, 0, 1, 0, 0) : norm(0, 0, 0, 1, 0, 0);
          break;
        }
        if (c <= 0.0) {
          t == Type::Lowpass ? norm(0, 0, 0, 1, 0, 0) : norm(1, 0, 0, 1, 0, 0);
          break;
        }
        const double res = dmath::exp10(q / 20.0), th = dmath::kPi * c;
        const double alpha = dmath::sin(th) / (2.0 * res), cw = dmath::cos(th);
        const double beta = t == Type::Lowpass ? (1.0 - cw) / 2.0 : (1.0 + cw) / 2.0,
                     s = t == Type::Lowpass ? 2.0 : -2.0;
        norm(beta, s * beta, beta, 1.0 + alpha, -2.0 * cw, 1.0 - alpha);
        break;
      }
      case Type::Lowshelf:
      case Type::Highshelf: {
        const double c = std::clamp(f, 0.0, 1.0), a = dmath::exp10(gainDb / 40.0);
        const bool low = t == Type::Lowshelf;
        if (c == 1.0) {
          low ? norm(a * a, 0, 0, 1, 0, 0) : norm(1, 0, 0, 1, 0, 0);
          break;
        }
        if (c <= 0.0) {
          low ? norm(1, 0, 0, 1, 0, 0) : norm(a * a, 0, 0, 1, 0, 0);
          break;
        }
        const double w0 = dmath::kPi * c,
                     alpha = 0.5 * dmath::sin(w0) * std::sqrt((a + 1.0 / a) * 0.0 + 2.0);
        const double k = dmath::cos(w0), k2 = 2.0 * std::sqrt(a) * alpha, ap = a + 1.0,
                     am = a - 1.0;
        if (low)
          norm(a * (ap - am * k + k2), 2.0 * a * (am - ap * k), a * (ap - am * k - k2),
               ap + am * k + k2, -2.0 * (am + ap * k), ap + am * k - k2);
        else
          norm(a * (ap + am * k + k2), -2.0 * a * (am + ap * k), a * (ap + am * k - k2),
               ap - am * k + k2, 2.0 * (am - ap * k), ap - am * k - k2);
        break;
      }
      case Type::Peaking:
      case Type::Allpass:
      case Type::Notch:
      case Type::Bandpass: {
        const double c = t == Type::Bandpass ? std::max(0.0, f) : std::clamp(f, 0.0, 1.0);
        q = std::max(0.0, q);
        const double a = dmath::exp10(gainDb / 40.0);
        if (!(c > 0.0 && c < 1.0)) {
          if (t == Type::Bandpass)
            norm(0, 0, 0, 1, 0, 0);
          else
            norm(1, 0, 0, 1, 0, 0);
          break;
        }
        if (q <= 0.0) {
          if (t == Type::Peaking)
            norm(a * a, 0, 0, 1, 0, 0);
          else if (t == Type::Allpass)
            norm(-1, 0, 0, 1, 0, 0);
          else if (t == Type::Notch)
            norm(0, 0, 0, 1, 0, 0);
          else
            norm(1, 0, 0, 1, 0, 0);
          break;
        }
        const double w0 = dmath::kPi * c, alpha = dmath::sin(w0) / (2.0 * q), k = dmath::cos(w0);
        if (t == Type::Peaking)
          norm(1 + alpha * a, -2 * k, 1 - alpha * a, 1 + alpha / a, -2 * k, 1 - alpha / a);
        else if (t == Type::Allpass)
          norm(1 - alpha, -2 * k, 1 + alpha, 1 + alpha, -2 * k, 1 - alpha);
        else if (t == Type::Notch)
          norm(1, -2 * k, 1, 1 + alpha, -2 * k, 1 - alpha);
        else
          norm(alpha, 0, -alpha, 1 + alpha, -2 * k, 1 - alpha);
        break;
      }
    }
  }
  float process(float x) noexcept {
    double y = b0_ * x + b1_ * x1_ + b2_ * x2_ - a1_ * y1_ - a2_ * y2_;
    x2_ = x1_;
    x1_ = x;
    y2_ = y1_;
    y1_ = y;
    // FTZ-independent (SIMULATION-0001): never let state decay into denormals.
    if (std::abs(y1_) < 1e-30)
      y1_ = 0.0;
    if (std::abs(y2_) < 1e-30)
      y2_ = 0.0;
    if (std::abs(y) < 1e-30)
      y = 0.0;
    return static_cast<float>(y);
  }
  void reset() noexcept { x1_ = x2_ = y1_ = y2_ = 0.0; }
  /// Same coefficients as `o`, own state (one AudioParam driving every channel of a node).
  void copyCoefs(const Biquad& filter) noexcept {
    b0_ = filter.b0_;
    b1_ = filter.b1_;
    b2_ = filter.b2_;
    a1_ = filter.a1_;
    a2_ = filter.a2_;
  }

 private:
  void norm(double b0, double b1, double b2, double a0, double a1, double a2) noexcept {
    const double i = 1.0 / a0;
    b0_ = b0 * i;
    b1_ = b1 * i;
    b2_ = b2 * i;
    a1_ = a1 * i;
    a2_ = a2 * i;
  }
  double b0_ = 1, b1_ = 0, b2_ = 0, a1_ = 0, a2_ = 0, x1_ = 0, x2_ = 0, y1_ = 0, y2_ = 0;
};

/// Chromium DelayNode: fractional delay, linear interpolation, read before write. Memory is a
/// caller-owned power-of-two span; max delay = size − 2 samples.
class DelayLine {
 public:
  void attach(std::span<float> mem) noexcept {
    buf_ = mem;
    mask_ = static_cast<std::uint32_t>(mem.size()) - 1;
    reset();
  }
  bool attached() const noexcept { return !buf_.empty(); }
  void reset() noexcept {
    std::fill(buf_.begin(), buf_.end(), 0.0f);
    w_ = 0;
  }
  /// The sample written `d` samples ago (d ≥ 1, fractional allowed).
  float read(double d) const noexcept {
    d = std::clamp(d, 1.0, static_cast<double>(mask_ - 1));
    const double p = static_cast<double>(w_) - d + static_cast<double>(mask_ + 1);
    const auto i = static_cast<std::uint32_t>(p);
    const double f = p - i;
    const float a = buf_[i & mask_], b = buf_[(i + 1) & mask_];
    return static_cast<float>(a + f * (b - a));
  }
  void write(float x) noexcept {
    buf_[w_ & mask_] = std::abs(x) < 1e-30f ? 0.0f : x;
    ++w_;
  }

 private:
  std::span<float> buf_{};
  std::uint32_t mask_ = 0, w_ = 0;
};

/// Exactly one Web Audio render quantum (128 frames) of delay: how Chromium breaks a feedback
/// cycle, where the node pulled while already in progress hands back its previous quantum's output.
struct QuantumDelay {
  std::array<float, 128> buf{};
  std::uint32_t i = 0;
  float process(float x) noexcept {
    const float y = buf[i];
    buf[i] = x;
    i = (i + 1) & 127u;
    return y;
  }
};

/// Tone.LFO: a Tone.Oscillator (PeriodicWave, phase in degrees delays the waveform) → AudioToGain →
/// Scale(min, max). Starts at phase 0 when created, like v1's LFOs (started in block Init).
class Lfo {
 public:
  void set(double hz, Waveform w, double phaseDeg, double min, double max,
           double sampleRate) noexcept {
    hz_ = hz;
    wave_ = w;
    phase_ = phaseDeg / 360.0;
    min_ = min;
    max_ = max;
    sr_ = sampleRate;
  }
  void setRange(double min, double max) noexcept {
    min_ = min;
    max_ = max;
  }
  void setRate(double hz) noexcept { hz_ = hz; }
  double next(const WavetableBank& bank) noexcept BLOKDUST_NONBLOCKING {
    double p = pos_ - phase_;
    p -= std::floor(p);
    double v;
    if (wave_ == Waveform::Sine)
      v = dmath::sin(dmath::kTwoPi * p);
    else {
      // LFO rates sit in the lowest band (all partials); read it with linear interpolation.
      const auto tb = bank.lookup(wave_, std::max(hz_, 1e-3)).higher;
      const double x = p * static_cast<double>(tb.size());
      const auto i = static_cast<std::uint32_t>(x);
      const double f = x - i;
      const std::uint32_t m = static_cast<std::uint32_t>(tb.size()) - 1;
      v = tb[i & m] + f * (tb[(i + 1) & m] - tb[i & m]);
    }
    pos_ += hz_ / sr_;
    pos_ -= std::floor(pos_);
    return min_ + (max_ - min_) * (v + 1.0) * 0.5;
  }
  void skip(int n) noexcept {
    for (int i = 0; i < n; ++i) {
      pos_ += hz_ / sr_;
      pos_ -= std::floor(pos_);
    }
  }

 private:
  double hz_ = 1, phase_ = 0, min_ = 0, max_ = 1, sr_ = 48000, pos_ = 0;
  Waveform wave_ = Waveform::Sine;
};

/// Chromium WaveShaperNode curve lookup (no oversampling): v = (N−1)(x+1)/2, clamped ends, linear
/// interpolation. `curve(i)` evaluates the Tone curve analytically, so no per-instance table is
/// needed.
template <typename Curve>
inline double waveShape(double x, int n, Curve&& curve) noexcept {
  const double v = (n - 1) * (x + 1.0) * 0.5;
  if (!(v > 0.0))
    return curve(0);
  if (v >= n - 1)
    return curve(n - 1);
  const int k = static_cast<int>(v);
  const double f = v - k;
  return (1.0 - f) * curve(k) + f * curve(k + 1);
}

// ---------------------------------------------------------------------------------------------------------------
// Effects (stereo, in place)
// ---------------------------------------------------------------------------------------------------------------

/// Tone.Volume: gain in dB via Tone's 2^(dB/6).
struct VolumeFx {
  double gain = 1.0;
  void set(double db) noexcept { gain = toneDbToGain(db); }
  void process(float* left, float* right, int n) const noexcept {
    for (int i = 0; i < n; ++i) {
      left[i] = static_cast<float>(left[i] * gain);
      right[i] = static_cast<float>(right[i] * gain);
    }
  }
};

/// N biquads in series per channel (Tone.Filter rolloff −12 = one biquad; Tone.EQMultiband = a
/// chain of them).
template <int N>
struct BiquadChainFx {
  std::array<Biquad, N> l{}, r{};
  void set(int i, Biquad::Type t, double hz, double q, double gainDb, double sr) noexcept {
    l[i].set(t, hz, q, gainDb, sr);
    r[i].set(t, hz, q, gainDb, sr);
  }
  void process(float* left, float* right, int n) noexcept {
    for (int i = 0; i < n; ++i)
      for (int k = 0; k < N; ++k) {
        left[i] = l[k].process(left[i]);
        right[i] = r[k].process(right[i]);
      }
  }
  void reset() noexcept {
    for (auto& b : l)
      b.reset();
    for (auto& b : r)
      b.reset();
  }
};

/// Tone.Distortion: Tone.Effect (equal-power wet/dry) around a 4096-point WaveShaper of
/// (3+k)·x·20°/(π + k|x|), k = 100·amount, 0 for |x| < 0.001.
struct DistortionFx {
  double k = 65.0;
  EqualPower mix{};
  void set(double amount, double wet) noexcept {
    k = amount * 100.0;
    mix.set(wet);
  }
  double shape(double x) const noexcept {
    const double kk = k;
    return waveShape(x, 4096, [kk](int i) {
      const double v =
          (static_cast<double>(i) / 4096.0) * 2.0 - 1.0;  // Tone setMap: i / len · 2 − 1
      return std::abs(v) < 0.001
                 ? 0.0
                 : (3.0 + kk) * v * 20.0 * (dmath::kPi / 180.0) / (dmath::kPi + kk * std::abs(v));
    });
  }
  void process(float* left, float* right, int n) const noexcept {
    for (int i = 0; i < n; ++i) {
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * shape(left[i]));
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * shape(right[i]));
    }
  }
};

/// Tone.BitCrusher: x − Modulo(x) with Tone.Modulo's 65536-point floor WaveShaper; wet/dry equal
/// power.
struct BitCrusherFx {
  double step = 1.0 / 64.0;
  EqualPower mix{};
  void set(double bits, double wet) noexcept {
    step = 1.0 / dmath::exp2(bits - 1.0);
    mix.set(wet);
  }
  double crush(double x) const noexcept {
    const double m = step;
    const double s = waveShape(x, 65536, [m](int i) {
      return std::floor(((static_cast<double>(i) / 65536.0) * 2.0 - 1.0 + 0.0001) / m);
    });
    return m * s;
  }
  void process(float* left, float* right, int n) const noexcept {
    for (int i = 0; i < n; ++i) {
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * crush(left[i]));
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * crush(right[i]));
    }
  }
};

/// Tone.Phaser (StereoEffect): 10 allpass biquads per side, Q from the block (v1: 1), frequency
/// swept by an LFO from baseFrequency to baseFrequency·2^octaves (right LFO at 180°), coefficients
/// updated per sample (a-rate).
struct PhaserFx {
  static constexpr int kStages = 10;
  std::array<Biquad, kStages> l{}, r{};
  Lfo lfoL{}, lfoR{};
  EqualPower mix{};
  double q = 1.0, sr = 48000.0;
  void configure(double rate, double octaves, double base, double wet, double sampleRate,
                 bool first) noexcept {
    sr = sampleRate;
    mix.set(wet);
    const double max = base * dmath::exp2(octaves);
    if (first) {
      lfoL.set(rate, Waveform::Sine, 0, base, max, sr);
      lfoR.set(rate, Waveform::Sine, 180, base, max, sr);
    } else {
      lfoL.setRate(rate);
      lfoR.setRate(rate);
      lfoL.setRange(base, max);
      lfoR.setRange(base, max);
    }
  }
  void process(float* left, float* right, int n,
               const WavetableBank& bank) noexcept BLOKDUST_NONBLOCKING {
    for (int i = 0; i < n; ++i) {
      const double fl = lfoL.next(bank), fr = lfoR.next(bank);
      for (auto& b : l)
        b.set(Biquad::Type::Allpass, fl, q, 0, sr);
      for (auto& b : r)
        b.set(Biquad::Type::Allpass, fr, q, 0, sr);
      float wl = left[i], wr = right[i];
      for (auto& b : l)
        wl = b.process(wl);
      for (auto& b : r)
        wr = b.process(wr);
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * wl);
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * wr);
    }
  }
};

/// Tone.Chorus (StereoXFeedbackEffect, wet 1 in v1): per side send → (direct + LFO-modulated delay)
/// → return, with cross feedback L→R and R→L. That cycle has no DelayNode on its direct path;
/// Chromium breaks it where its pull order re-enters a node in progress (the left return, read one
/// render quantum late by the right side).
struct ChorusFx {
  DelayLine dl{}, dr{}, qL{}, qR{};  // modulated delays (qL/qR pool memory unused: kept for layout)
  QuantumDelay lToR{};  // the right send reads the left return one quantum late (pull order)
  Lfo lfoL{}, lfoR{};
  EqualPower mix{};
  double feedback = 0.4, sr = 48000.0;
  float lToRPrev_ = 0.0f;
  void configure(double rate, double delayMs, double depth, double fb, double sampleRate,
                 bool first) noexcept {
    sr = sampleRate;
    feedback = fb;
    mix.set(1.0);
    const double dt = delayMs / 1000.0, dev = dt * depth, mn = std::max(dt - dev, 0.0),
                 mx = dt + dev;
    if (first) {
      lfoL.set(rate, Waveform::Sine, 0, mn, mx, sr);
      lfoR.set(rate, Waveform::Sine, 180, mn, mx, sr);
    } else {
      lfoL.setRate(rate);
      lfoR.setRate(rate);
      lfoL.setRange(mn, mx);
      lfoR.setRange(mn, mx);
    }
  }
  void process(float* left, float* right, int n,
               const WavetableBank& bank) noexcept BLOKDUST_NONBLOCKING {
    if (!dl.attached())
      return;
    for (int i = 0; i < n; ++i) {
      // Chromium pull order: the left return is in progress when the right side needs it (stale by
      // one quantum); the right return is then fresh for the left side.
      const double tl = lfoL.next(bank) * sr, tr = lfoR.next(bank) * sr;
      const float sendR = right[i] + static_cast<float>(feedback * lToRPrev_);
      const float delR = dr.read(std::max(1.0, tr));
      dr.write(sendR);
      const float retR = sendR + delR;
      const float sendL = left[i] + static_cast<float>(feedback * retR);
      const float delL = dl.read(std::max(1.0, tl));
      dl.write(sendL);
      const float retL = sendL + delL;
      lToRPrev_ = lToR.process(retL);
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * retL);
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * retR);
    }
  }
};

/// Tone.Freeverb (StereoEffect): 4 lowpass-feedback-comb filters per side in parallel (Tone
/// tunings, in seconds of 44.1 kHz samples) → 4 allpass biquads (225, 556, 441, 341 Hz, Q 1) in
/// series. Comb: delay → lowpass (Q 0 dB, cutoff ScaleExp(100, 8000, 0.5) of dampening) → gain
/// roomSize → back into the delay.
struct FreeverbFx {
  static constexpr double kTunings[8] = {1557.0 / 44100, 1617.0 / 44100, 1491.0 / 44100,
                                         1422.0 / 44100, 1277.0 / 44100, 1356.0 / 44100,
                                         1188.0 / 44100, 1116.0 / 44100};
  static constexpr double kAllpass[4] = {225, 556, 441, 341};
  std::array<DelayLine, 8> comb{};
  std::array<Biquad, 8> lp{};
  std::array<QuantumDelay, 8>
      loopQ{};  // each comb's feedback re-enters the lowpass in progress: +1 quantum
  std::array<Biquad, 4> apL{}, apR{};
  EqualPower mix{};
  double room = 0.5, sr = 48000.0;
  void configure(double wet, double sampleRate) noexcept {
    sr = sampleRate;
    mix.set(wet);
    for (int i = 0; i < 4; ++i) {
      apL[i].set(Biquad::Type::Allpass, kAllpass[i], 1.0, 0, sr);
      apR[i].set(Biquad::Type::Allpass, kAllpass[i], 1.0, 0, sr);
    }
  }
  void setRoomSize(double r) noexcept { room = r; }
  void setDampening(double d) noexcept {
    const double cutoff =
        100.0 + 7900.0 * dmath::pow(std::max(0.0, d), 0.5);  // Tone.ScaleExp(100, 8000, 0.5)
    for (auto& f : lp)
      f.set(Biquad::Type::Lowpass, cutoff, 0.0, 0, sr);
  }
  void process(float* left, float* right, int n) noexcept {
    if (!comb[0].attached())
      return;
    for (int i = 0; i < n; ++i) {
      float sumL = 0, sumR = 0;
      for (int c = 0; c < 8; ++c) {
        const float d = comb[c].read(kTunings[c] * sr);
        const float y = lp[c].process(d);
        comb[c].write((c < 4 ? left[i] : right[i]) +
                      static_cast<float>(room * loopQ[c].process(y)));
        (c < 4 ? sumL : sumR) += y;
      }
      for (auto& a : apL)
        sumL = a.process(sumL);
      for (auto& a : apR)
        sumR = a.process(sumR);
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * sumL);
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * sumR);
    }
  }
};

/// Tone.PingPongDelay (StereoXFeedbackEffect): L = D(inL + fb·R), R = D(D_pre(inR) + fb·L); v1
/// ramps delayTime changes (StereoDelay.SetParam rampTo), modelled as a 50 ms one-pole glide.
/// Chromium renders the cycle pulling the left return first, so the L→R feedback carries one extra
/// render quantum (calibrated against v1: only this placement matches, SPEC-AUDIO-V1-PARITY).
struct PingPongFx {
  DelayLine dl{}, dr{}, pre{};
  QuantumDelay
      qLR{};  // Chromium pulls the left return first, so the L→R feedback reads it one quantum late
  EqualPower mix{};
  double feedback = 0.4, delay = 0.25, target = 0.25, glide = 0.0, sr = 48000.0;
  void configure(double delaySeconds, double fb, double wet, double sampleRate,
                 bool first) noexcept {
    sr = sampleRate;
    feedback = fb;
    mix.set(wet);
    target = delaySeconds;
    if (first)
      delay = delaySeconds;
    glide = 1.0 - dmath::exp(-1.0 / (0.05 * sampleRate));
  }
  void process(float* left, float* right, int n) noexcept {
    if (!dl.attached())
      return;
    for (int i = 0; i < n; ++i) {
      delay += (target - delay) * glide;
      const double d = delay * sr;
      const float outL = dl.read(d), outR = dr.read(d), p = pre.read(d);
      const float fbL = qLR.process(outL);
      dl.write(left[i] + static_cast<float>(feedback * outR));
      pre.write(right[i]);
      dr.write(p + static_cast<float>(feedback * fbL));
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * outL);
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * outR);
    }
  }
};

/// Tone.AutoWah (v1: sensitivity −10 dB, gain 30, follower attack/release from the block; Q left at
/// Tone's 2). effectSend → ×1/2^(−10/6) → Tone.Follower → Tone.ScaleExp(base, top, 0.5) → frequency
/// of a Tone.Filter (rolloff −48: 3 biquads in r6) and a peaking filter (+30 dB, Q 1). v1 builds
/// that "bandpass" without a type, so it is Tone.Filter's default lowpass (Q 2 dB). Measured in v1:
/// 3 lowpass stages, peaking +30 dB. Tone.Follower: |x| → lowpass (Q −100 dB) whose a-rate
/// frequency is attack Hz while |x| ≤ the output one render quantum ago (a DelayNode of blockTime
/// in the cycle), release Hz otherwise (a 1024-point WaveShaper of ×10000). AudioParams sum their
/// input to mono, so the stereo control signals are averaged. Coefficients per sample (Chromium
/// biquads with sample-accurate frequency).
struct AutoWahFx {
  Biquad folL{}, folR{};
  QuantumDelay heldL{}, heldR{};
  std::array<Biquad, 3> lpL{}, lpR{};
  Biquad pkL{}, pkR{};
  EqualPower mix{};
  double attackHz = 1, releaseHz = 1, base = 100, top = 3200, boost = 1, sr = 48000.0;
  void configure(double octaves, double baseFrequency, double wet, double attack, double release,
                 double sampleRate) noexcept {
    sr = sampleRate;
    mix.set(wet);
    boost = 1.0 / toneDbToGain(-10.0);
    const double minTime =
        128.0 / sr;  // Tone compares a frequency with blockTime (seconds); kept as v1 ran it
    attackHz = std::max(1.0 / std::max(attack, 1e-6), minTime);
    releaseHz = std::max(1.0 / std::max(release, 1e-6), minTime);
    base = baseFrequency;
    top = std::min(baseFrequency * dmath::exp2(octaves), sr / 2.0);
  }
  void process(float* left, float* right, int n) noexcept {
    const auto followerMap = [this](int k) {
      return (k * 2.0 / 1023.0) - 1.0 <= 0.0 ? attackHz : releaseHz;
    };
    const auto sqrtMap = [](int k) {
      return std::sqrt(std::abs(k * 2.0 / 8191.0 - 1.0));
    };  // Tone.Pow(0.5), 8192 pts
    for (int i = 0; i < n; ++i) {
      const double al = std::abs(std::clamp(left[i] * boost, -1.0, 1.0)),
                   ar = std::abs(std::clamp(right[i] * boost, -1.0, 1.0));
      const double fl = waveShape((al - heldL.buf[heldL.i]) * 10000.0, 1024, followerMap);
      const double fr = waveShape((ar - heldR.buf[heldR.i]) * 10000.0, 1024, followerMap);
      folL.set(Biquad::Type::Lowpass, (fl + fr) * 0.5, -100.0, 0.0, sr);
      folR.copyCoefs(folL);
      const float yl = folL.process(static_cast<float>(al)),
                  yr = folR.process(static_cast<float>(ar));
      heldL.process(yl);
      heldR.process(yr);
      const double sl = base + (top - base) * waveShape(yl, 8192, sqrtMap),
                   sr2 = base + (top - base) * waveShape(yr, 8192, sqrtMap);
      const double sweep = (sl + sr2) * 0.5;
      lpL[0].set(Biquad::Type::Lowpass, sweep, 2.0, 0.0, sr);
      for (int k = 1; k < 3; ++k)
        lpL[k].copyCoefs(lpL[0]);
      for (int k = 0; k < 3; ++k)
        lpR[k].copyCoefs(lpL[0]);
      pkL.set(Biquad::Type::Peaking, sweep, 1.0, 30.0, sr);
      pkR.copyCoefs(pkL);
      float wl = left[i], wr = right[i];
      for (int k = 0; k < 3; ++k) {
        wl = lpL[k].process(wl);
        wr = lpR[k].process(wr);
      }
      wl = pkL.process(wl);
      wr = pkR.process(wr);
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * wl);
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * wr);
    }
  }
};

/// v1 Chomp: a Tone.Filter (−12) whose frequency a setTimeout chain sets to 100 + round(rand·10000)
/// every `rate` ms (Chrome clamps nested timers to ≥ 4 ms; a main-thread change lands on a
/// render-quantum boundary). It starts at round(101 − rate) Hz, as v1's constructor computes it.
/// Random draws come from the engine seed. Measured in v1: the filter is a *peaking* biquad (gain =
/// the Gain slider, Q = Width), not Tone's default lowpass.
struct ChompFx {
  Biquad l{}, r{};
  Pcg32 rng{};
  double hz = 88, q = 0.6, gainDb = 15, sr = 48000.0;
  std::int64_t t = 0, next = 0, interval = 624;
  void configure(double rateMs, double Q, double gain, double sampleRate, bool first,
                 std::uint64_t seed) noexcept {
    sr = sampleRate;
    q = Q;
    gainDb = gain;
    interval = static_cast<std::int64_t>(std::max(rateMs, 4.0) * sr / 1000.0);
    if (first) {
      rng = Pcg32(seed, 0xC40Bu);
      hz = std::round(101.0 - rateMs);
      t = 0;
      next = static_cast<std::int64_t>(std::max(rateMs, 1.0) * sr / 1000.0);
    }
    l.set(Biquad::Type::Peaking, hz, q, gainDb, sr);
    r.copyCoefs(l);
  }
  void process(float* left, float* right, int n) noexcept {
    for (int i = 0; i < n; ++i, ++t) {
      if ((t & 127) == 0 && t >= next) {
        hz = 100.0 + std::round(rng.nextFloat() * 10000.0);
        l.set(Biquad::Type::Peaking, hz, q, gainDb, sr);
        r.copyCoefs(l);
        next = t + interval;
      }
      left[i] = l.process(left[i]);
      right[i] = r.process(right[i]);
    }
  }
};

/// v1 Chopper = Tone.Tremolo (StereoEffect): per side gain = Scale(1, 0) of AudioToGain(depth ·
/// LFO), LFO phases 90 ∓ spread/2. v1's SetParam has no `mix` case, so the wet level is the one set
/// at creation.
struct ChopperFx {
  Lfo lfoL{}, lfoR{};
  EqualPower mix{};
  double depth = 1.0;
  void configure(double rate, double d, double spread, int waveform, double wet, double sr,
                 bool first) noexcept {
    depth = d;
    const auto w = static_cast<Waveform>(std::clamp(waveform, 0, 3));
    if (first)
      mix.set(wet);
    lfoL.set(rate, w, 90.0 - spread / 2.0, -1.0, 1.0, sr);
    lfoR.set(rate, w, 90.0 + spread / 2.0, -1.0, 1.0, sr);
  }
  void process(float* left, float* right, int n,
               const WavetableBank& bank) noexcept BLOKDUST_NONBLOCKING {
    for (int i = 0; i < n; ++i) {
      const double gl = 1.0 - (depth * lfoL.next(bank) + 1.0) * 0.5,
                   gr = 1.0 - (depth * lfoR.next(bank) + 1.0) * 0.5;
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * left[i] * gl);
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * right[i] * gr);
    }
  }
};

/// Tone.PitchShift (FeedbackEffect, feedback 0): two delay lines whose times are sawtooth LFOs (0°
/// and 180°) sweeping the window, equal-power crossfaded by a triangle LFO (90°), all at
/// factor·1.2/window Hz. v1 constructs it with the pitch only and never sets windowSize, so the
/// window is Tone's default 0.1 s.
struct PitchShiftFx {
  static constexpr double kWindow = 0.1;
  DelayLine aL{}, aR{}, bL{}, bR{};
  Lfo lfoA{}, lfoB{}, fade{};
  EqualPower mix{};
  double sr = 48000.0;
  void configure(double pitch, double wet, double sampleRate, bool first) noexcept {
    sr = sampleRate;
    mix.set(wet);
    const bool down = pitch < 0.0;
    const double factor =
        down ? dmath::exp2((pitch - 1.0) / 12.0) + 1.0 : dmath::exp2(pitch / 12.0) - 1.0;
    const double hz = factor * (1.2 / kWindow), mn = down ? 0.0 : kWindow,
                 mx = down ? kWindow : 0.0;
    if (first) {
      lfoA.set(hz, Waveform::Saw, 0, mn, mx, sr);
      lfoB.set(hz, Waveform::Saw, 180, mn, mx, sr);
      fade.set(hz, Waveform::Triangle, 90, 0, 1, sr);
    } else {
      lfoA.setRate(hz);
      lfoB.setRate(hz);
      fade.setRate(hz);
      lfoA.setRange(mn, mx);
      lfoB.setRange(mn, mx);
    }
  }
  void process(float* left, float* right, int n,
               const WavetableBank& bank) noexcept BLOKDUST_NONBLOCKING {
    if (!aL.attached())
      return;
    const auto eq = [](double x) {
      return std::abs(x) < 0.001 ? 0.0 : dmath::sin(std::clamp(x, 0.0, 1.0) * dmath::kPi / 2.0);
    };
    for (int i = 0; i < n; ++i) {
      // Chromium DelayNode: write, then read `delay` behind (0 = this sample).
      const double da = lfoA.next(bank) * sr + 1.0, db = lfoB.next(bank) * sr + 1.0,
                   f = fade.next(bank);
      const double ga = eq(1.0 - f), gb = eq(f);
      aL.write(left[i]);
      bL.write(left[i]);
      aR.write(right[i]);
      bR.write(right[i]);
      const double wl = ga * aL.read(da) + gb * bL.read(db),
                   wr = ga * aR.read(da) + gb * bR.read(db);
      left[i] = static_cast<float>(mix.dry * left[i] + mix.wet * wl);
      right[i] = static_cast<float>(mix.dry * right[i] + mix.wet * wr);
    }
  }
};

// ---------------------------------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------------------------------

/// Tone.Noise (white / pink / brown, v1 WaveformTypeIndexNoise) with Tone's generators, two
/// independent channels downmixed by Tone.Mono to (L+R)/2. Tone loops 4 s of Math.random noise;
/// this generates continuously from a per-block seeded PCG32 (deterministic; statistically the same
/// sound).
class NoiseGen {
 public:
  void seed(std::uint64_t s) noexcept { rng_ = Pcg32(s, 0x2545f4914f6cdd1dULL); }
  void setType(int t) noexcept { type_ = std::clamp(t, 0, 2); }
  /// v1's noise reaches the output through Chromium's AudioBufferSourceNode, and measured v1
  /// renders show a high-end droop like reading at a constant fractional position (linear
  /// interpolation). Modelled as that two-tap interpolation, fraction 0.18 fitted to v1's white,
  /// pink and brown renders (empirical, SPEC-AUDIO-V1-PARITY; the exact cause in Chromium is not
  /// pinned down).
  double next() noexcept {
    const double x = 0.5 * (ch_[0].next(type_, rng_) + ch_[1].next(type_, rng_));
    const double y = 0.82 * x + 0.18 * prev_;
    prev_ = x;
    return y;
  }

 private:
  struct Channel {
    double b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    double next(int type, Pcg32& rng) noexcept {
      const double white = static_cast<double>(rng.next()) / 4294967296.0 * 2.0 - 1.0;
      if (type == 0)
        return white;
      if (type == 1) {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const double out = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
        return out;
      }
      last = (last + 0.02 * white) / 1.02;
      return last * 3.5;
    }
  };
  Pcg32 rng_{};
  std::array<Channel, 2> ch_{};
  double prev_ = 0.0;
  int type_ = 2;
};

}  // namespace blokdust::dsp
