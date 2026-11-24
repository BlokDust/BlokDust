#pragma once

#include "blokdust/realtime.hpp"
// Band-limited oscillator wavetables, ported from Chromium's PeriodicWaveHandler (BSD licence, ©
// The Chromium Authors; see NOTICE.md), because v1's Tone.Oscillator is a Web Audio OscillatorNode
// and its square/saw/triangle are exactly these tables (CHG-0002 1.4, SPEC-AUDIO-V1-PARITY). Built
// once per sample rate at engine construction (allocation happens here, never on the audio thread)
// and shared read-only by every oscillator. Deterministic: the inverse FFT uses dmath twiddles and
// IEEE basic operations only.
#include <complex>
#include <span>
#include <vector>

namespace blokdust::dsp {

/// In-place iterative radix-2 complex FFT, inverse direction (e^{+i...}), unscaled. Twiddles from
/// dmath (deterministic). Shared with the Wavetable block's tables (tablebank.cpp).
void inverseFft(std::vector<std::complex<double>>& a);
/// The same transform with its twiddles looked up instead of computed: `twiddles` holds, for every
/// power-of-two len from 2 up to the transform size, the len/2 values e^{2πik/len} (dmath, the same
/// expression) starting at index len/2 − 1.
void inverseFft(std::vector<std::complex<double>>& a,
                const std::vector<std::complex<double>>& twiddles);
std::vector<std::complex<double>> fftTwiddles(std::size_t maxSize);

/// v1 App.Audio.WaveformTypeIndex: 0 sine, 1 square, 2 triangle, 3 sawtooth.
enum class Waveform : int { Sine = 0, Square = 1, Triangle = 2, Saw = 3 };

class WavetableBank {
 public:
  explicit WavetableBank(double sampleRate);

  /// Chromium WaveDataForFundamentalFrequency: the two tables bracketing `hz` and the factor to
  /// blend them.
  struct Lookup {
    std::span<const float> higher, lower;
    double tableFactor = 0.0;
  };
  Lookup lookup(Waveform w, double hz) const noexcept BLOKDUST_NONBLOCKING;

  unsigned size() const noexcept { return size_; }
  /// Table read-index increment per sample for `hz` (Chromium rate_scale).
  double increment(double hz) const noexcept {
    return hz * static_cast<double>(size_) / sampleRate_;
  }

 private:
  double sampleRate_;
  unsigned size_;    // 2048 / 4096 / 16384 by sample rate (Chromium GetPeriodicWaveSize)
  unsigned ranges_;  // round(3 · log2(size)): three bands per octave
  double lowestHz_;  // sampleRate / size
  // tables_[shape][range][i], shape index = Waveform - 1 (square, triangle, saw); sine is computed
  // directly.
  std::vector<float> tables_;
  std::span<const float> table(int shape, unsigned range) const noexcept;
};

}  // namespace blokdust::dsp
