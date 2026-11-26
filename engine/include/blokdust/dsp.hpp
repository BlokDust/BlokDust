#pragma once

#include "blokdust/realtime.hpp"
// Minimal, deterministic DSP primitives for the Phase 0 engine spike.
// Parity with v1's Tone.js sound is a Phase 1 job (golden-audio tests); these are correct, not yet
// calibrated.
#include <algorithm>
#include <array>
#include <cmath>
#include <numbers>

#include "blokdust/dmath.hpp"
#include "blokdust/wavetable.hpp"

namespace blokdust::dsp {

/// v1's Tone.Oscillator is a Web Audio OscillatorNode: square/triangle/saw read Chromium's
/// band-limited wavetables (wavetable.hpp) with linear interpolation inside a table and a blend
/// between the two bracketing pitch bands (Chromium OscillatorHandler::ProcessKRateScalar). Sine is
/// computed directly with dmath (identical to v1 within measurement). Read index starts at 0 like a
/// freshly started OscillatorNode.
class Oscillator {
 public:
  void setWaveform(Waveform w) noexcept { wave_ = w; }
  /// Must follow setWaveform when both change: picks the bands for this pitch.
  void setFrequency(double hz, const WavetableBank& bank) noexcept BLOKDUST_NONBLOCKING {
    bank_ = &bank;
    baseHz_ = hz;
    size_ = bank.size();
    inc_ = bank.increment(hz);
    if (wave_ != Waveform::Sine)
      lookup_ = bank.lookup(wave_, hz);
  }
  /// Frequency modulated by `cents` of detune this sample (Web Audio a-rate detune: v1
  /// Vibrato/Scuzz LFOs). Like Chromium's a-rate path, the wavetable bands follow the instantaneous
  /// frequency.
  double next(double cents) noexcept BLOKDUST_NONBLOCKING {
    if (cents == 0.0 || !bank_)
      return next();
    const double hz = baseHz_ * dmath::exp2(cents / 1200.0);
    const double keepInc = inc_;
    const auto keepLookup = lookup_;
    inc_ = bank_->increment(hz);
    if (wave_ != Waveform::Sine)
      lookup_ = bank_->lookup(wave_, hz);
    const double v = next();
    inc_ = keepInc;
    lookup_ = keepLookup;
    return v;
  }
  double next() noexcept BLOKDUST_NONBLOCKING {
    double v = 0.0;
    if (wave_ == Waveform::Sine || !bank_) {
      v = dmath::sin(dmath::kTwoPi * (idx_ / static_cast<double>(size_)));
    } else {
      const auto i0 = static_cast<unsigned>(idx_);
      const double f = idx_ - i0;
      const unsigned mask = size_ - 1, a = i0 & mask, b = (i0 + 1) & mask;
      const double hi = lookup_.higher[a] + f * (lookup_.higher[b] - lookup_.higher[a]);
      const double lo = lookup_.lower[a] + f * (lookup_.lower[b] - lookup_.lower[a]);
      v = hi + lookup_.tableFactor * (lo - hi);
    }
    advance();
    return v;
  }
  /// Advance n samples without output, with exactly the arithmetic of next(): free-running
  /// oscillators keep phase independent of when they are heard, so output never depends on buffer
  /// segmentation.
  void skip(int n) noexcept {
    for (int i = 0; i < n; ++i)
      advance();
  }
  void reset() noexcept { idx_ = 0.0; }

 private:
  void advance() noexcept {
    idx_ += inc_;
    const double n = static_cast<double>(size_);
    idx_ -= std::floor(idx_ / n) * n;
  }
  const WavetableBank* bank_ = nullptr;
  WavetableBank::Lookup lookup_{};
  unsigned size_ = 4096;
  double idx_ = 0.0, inc_ = 0.0, baseHz_ = 0.0;
  Waveform wave_ = Waveform::Triangle;
};

/// Linear-segment ADSR (v1 Source.Settings.envelope defaults: A 0.01, D 0.5, S 0.5, R 0.01
/// seconds).
class Envelope {
 public:
  struct Settings {
    double attack = 0.01, decay = 0.5, sustain = 0.5, release = 0.01;
  };
  void configure(const Settings& s, double sampleRate) noexcept {
    s_ = s;
    sr_ = sampleRate;
  }
  void gateOn() noexcept { stage_ = Stage::Attack; }
  void gateOff() noexcept {
    if (stage_ != Stage::Idle) {
      stage_ = Stage::Release;
      releaseFrom_ = level_;
    }
  }
  bool active() const noexcept { return stage_ != Stage::Idle; }
  double next() noexcept {
    switch (stage_) {
      case Stage::Idle:
        return 0.0;
      case Stage::Attack:
        level_ += 1.0 / std::max(1.0, s_.attack * sr_);
        if (level_ >= 1.0) {
          level_ = 1.0;
          stage_ = Stage::Decay;
        }
        break;
      case Stage::Decay:
        level_ -= (1.0 - s_.sustain) / std::max(1.0, s_.decay * sr_);
        if (level_ <= s_.sustain) {
          level_ = s_.sustain;
          stage_ = Stage::Sustain;
        }
        break;
      case Stage::Sustain:
        break;
      case Stage::Release:
        level_ -= releaseFrom_ / std::max(1.0, s_.release * sr_);
        if (level_ <= 0.0) {
          level_ = 0.0;
          stage_ = Stage::Idle;
        }
        break;
    }
    return level_;
  }

 private:
  enum class Stage : std::uint8_t { Idle, Attack, Decay, Sustain, Release };
  Settings s_{};
  double sr_ = 48000.0;
  double level_ = 0.0;
  double releaseFrom_ = 0.0;
  Stage stage_ = Stage::Idle;
};

/// v1's master bus compressor: a Web Audio DynamicsCompressorNode (v1 Audio.ts: threshold −8 dB,
/// knee 10 dB, ratio 8, attack 0, release 0.05 s), which in Chromium is blink::DynamicsCompressor.
/// This is a port of that algorithm
/// (third_party/blink/renderer/platform/audio/dynamics_compressor.cc, BSD licence, © 2011 Google
/// Inc.; see NOTICE.md): 6 ms look-ahead, exponential knee, sin-warped gain, adaptive release
/// polynomial, make-up gain (1/sat(1))^0.6, gain envelope updated every 32 frames. Differences from
/// Chromium: double precision and dmath instead of float libm (so it is deterministic everywhere),
/// and the 32-frame division phase is kept across calls, so the output does not depend on buffer
/// segmentation. Parameters are fixed to v1's values (stereo-linked detection, max of |L| and |R|).
class MasterCompressor {
 public:
  /// The master bus: v1's settings.
  void configure(double sampleRate) noexcept {
    sr_ = sampleRate;
    preDelay_ = std::min(static_cast<int>(0.006 * sampleRate), kMaxPreDelay - 1);
    setParams(-8.0, 10.0, 8.0, 0.0, 0.05);
    reset();
  }
  /// The Compressor block (CHG-0014) sets these while running: nothing is reset, the gain envelope
  /// carries on.
  void setParams(double kThresholdDb, double kKneeDb, double kRatio, double kAttack,
                 double kRelease) noexcept {
    const double sampleRate = sr_;
    linearThreshold_ = dbToLinear(kThresholdDb);
    slope_ = 1.0 / kRatio;
    k_ = kAtSlope(kThresholdDb, kKneeDb, 1.0 / kRatio);
    dbKneeThreshold_ = kThresholdDb + kKneeDb;
    kneeThreshold_ = dbToLinear(dbKneeThreshold_);
    dbYKneeThreshold_ = linearToDb(kneeCurve(kneeThreshold_, k_));
    postGain_ = dmath::pow(1.0 / saturate(1.0, k_), 0.6);
    attackFrames_ = std::max(0.001, kAttack) * sampleRate;
    const double releaseFrames = sampleRate * kRelease;
    constexpr double z1 = 0.09, z2 = 0.16, z3 = 0.42, z4 = 0.98;  // release zones
    ra_ = releaseFrames * (0.9999999999999998 * z1 + 1.8432219684323923e-16 * z2 -
                           1.9373394351676423e-16 * z3 + 8.824516011816245e-18 * z4);
    rb_ = releaseFrames * (-1.5788320352845888 * z1 + 2.3305837032074286 * z2 -
                           0.9141194204840429 * z3 + 0.1623677525612032 * z4);
    rc_ = releaseFrames * (0.5334142869106424 * z1 - 1.272736789213631 * z2 +
                           0.9258856042207512 * z3 - 0.18656310191776226 * z4);
    rd_ = releaseFrames * (0.08783463138207234 * z1 - 0.1694162967925622 * z2 +
                           0.08588057951595272 * z3 - 0.00429891410546283 * z4);
    re_ = releaseFrames * (-0.042416883008123074 * z1 + 0.1115693827987602 * z2 -
                           0.09764676325265872 * z3 + 0.028494263462021576 * z4);
    satReleaseFrames_ = 0.0025 * sampleRate;
  }
  /// How far the gain is turned down right now, in dB (≤ 0): Web Audio's `reduction`, for the
  /// block's meter.
  double reductionDb() const noexcept {
    return linearToDb(dmath::sin(dmath::kPi / 2.0 * compressorGain_));
  }
  void reset() noexcept {
    detectorAverage_ = 0.0;
    compressorGain_ = 1.0;
    maxAttackDiffDb_ = -1.0;
    division_ = 0;
    delayL_.fill(0.0f);
    delayR_.fill(0.0f);
    read_ = 0;
    write_ = preDelay_;
  }
  /// One stereo frame in place.
  void process(float& left, float& right) noexcept {
    if (division_ == 0)
      updateEnvelopeRate();
    division_ = (division_ + 1) & 31;
    delayL_[static_cast<std::size_t>(write_)] = left;
    delayR_[static_cast<std::size_t>(write_)] = right;
    const double absInput =
        std::max(std::abs(static_cast<double>(left)), std::abs(static_cast<double>(right)));
    const double shaped = saturate(absInput, k_);
    const double attenuation = absInput <= 0.0001 ? 1.0 : shaped / absInput;
    const double dbAttenuation = std::max(2.0, -linearToDb(attenuation));
    const double satReleaseRate = dbToLinear(dbAttenuation / satReleaseFrames_) - 1.0;
    const double rate = attenuation > detectorAverage_ ? satReleaseRate : 1.0;
    detectorAverage_ += (attenuation - detectorAverage_) * rate;
    detectorAverage_ = std::min(1.0, detectorAverage_);
    if (envelopeRate_ < 1.0)
      compressorGain_ += (scaledDesiredGain_ - compressorGain_) * envelopeRate_;
    else
      compressorGain_ = std::min(1.0, compressorGain_ * envelopeRate_);
    if (std::abs(detectorAverage_) < 1e-30)
      detectorAverage_ = 0.0;  // FTZ-independent (SIMULATION-0001)
    if (std::abs(compressorGain_) < 1e-30)
      compressorGain_ = 0.0;
    const double total = postGain_ * dmath::sin(dmath::kPi / 2.0 * compressorGain_);
    left = static_cast<float>(delayL_[static_cast<std::size_t>(read_)] * total);
    right = static_cast<float>(delayR_[static_cast<std::size_t>(read_)] * total);
    read_ = (read_ + 1) & (kMaxPreDelay - 1);
    write_ = (write_ + 1) & (kMaxPreDelay - 1);
  }

 private:
  static constexpr int kMaxPreDelay = 1024;
  static double dbToLinear(double db) noexcept { return dmath::exp10(0.05 * db); }
  static double linearToDb(double x) noexcept { return x > 0.0 ? 20.0 * dmath::log10(x) : -1000.0; }
  double kneeCurve(double x, double k) const noexcept {
    return x < linearThreshold_
               ? x
               : linearThreshold_ + (1.0 - dmath::exp(-k * (x - linearThreshold_))) / k;
  }
  double saturate(double x, double k) const noexcept {
    if (x < kneeThreshold_)
      return kneeCurve(x, k);
    return dbToLinear(dbYKneeThreshold_ + slope_ * (linearToDb(x) - dbKneeThreshold_));
  }
  double kAtSlope(double dbThreshold, double dbKnee, double desiredSlope) const noexcept {
    const double dbX = dbThreshold + dbKnee, x = dbToLinear(dbX);
    double x2 = 1.0, dbX2 = 0.0;
    if (!(x < linearThreshold_)) {
      x2 = x * 1.001;
      dbX2 = linearToDb(x2);
    }
    double minK = 0.1, maxK = 10000.0, k = 5.0;
    for (int i = 0; i < 15; ++i) {
      double s = 1.0;
      if (!(x < linearThreshold_))
        s = (linearToDb(kneeCurve(x2, k)) - linearToDb(kneeCurve(x, k))) / (dbX2 - dbX);
      if (s < desiredSlope)
        maxK = k;
      else
        minK = k;
      k = std::sqrt(minK * maxK);
    }
    return k;
  }
  /// Chromium recomputes the envelope rate at the start of every 32-frame division.
  void updateEnvelopeRate() noexcept {
    scaledDesiredGain_ = dmath::asin(detectorAverage_) / (dmath::kPi / 2.0);
    const bool releasing = scaledDesiredGain_ > compressorGain_;
    double diffDb = scaledDesiredGain_ == 0.0 ? (releasing ? -1.0 : 1.0)
                                              : linearToDb(compressorGain_ / scaledDesiredGain_);
    if (releasing) {
      maxAttackDiffDb_ = -1.0;
      double x = std::clamp(diffDb, -12.0, 0.0);
      x = 0.25 * (x + 12.0);
      const double x2 = x * x, x3 = x2 * x, x4 = x2 * x2;
      const double releaseFrames = ra_ + rb_ * x + rc_ * x2 + rd_ * x3 + re_ * x4;
      envelopeRate_ = dbToLinear(5.0 / releaseFrames);
    } else {
      if (maxAttackDiffDb_ == -1.0 || maxAttackDiffDb_ < diffDb)
        maxAttackDiffDb_ = diffDb;
      const double eff = std::max(0.5, maxAttackDiffDb_);
      envelopeRate_ = 1.0 - dmath::pow(0.25 / eff, 1.0 / attackFrames_);
    }
  }

  double sr_ = 48000.0, linearThreshold_ = 0, slope_ = 0, k_ = 0, dbKneeThreshold_ = 0,
         kneeThreshold_ = 0, dbYKneeThreshold_ = 0;
  double postGain_ = 1, attackFrames_ = 1, satReleaseFrames_ = 1, ra_ = 0, rb_ = 0, rc_ = 0,
         rd_ = 0, re_ = 0;
  double detectorAverage_ = 0, compressorGain_ = 1, maxAttackDiffDb_ = -1, envelopeRate_ = 1,
         scaledDesiredGain_ = 0;
  int preDelay_ = 0, read_ = 0, write_ = 0, division_ = 0;
  std::array<float, kMaxPreDelay> delayL_{}, delayR_{};
};

}  // namespace blokdust::dsp
