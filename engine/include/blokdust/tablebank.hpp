#pragma once
// The Wavetable block's built-in tables (CHG-0029, AUDIO-0004). Each table is kFrames single-cycle frames that the
// block's Position fades through. Every frame is made from maths in tablebank.cpp (no audio is stored anywhere,
// DATA-0005): a spectrum of up to kMaxPartials harmonics, turned into one band-limited cycle per octave band by the
// same deterministic inverse FFT as the Tone's tables (wavetable.hpp).
//
// Bands: band b keeps harmonics 1 … kMaxPartials >> b and is stored at 4 samples per highest harmonic (at least 64),
// so a frame holds 2048 + 1024 + … + 64 samples whatever the sample rate (≈ 1.1 MB per table). The partial cap means
// very low notes at very high sample rates simply stop adding harmonics far above hearing.
//
// Some tables are inharmonic (bells, gongs): one table cycle spans `period` cycles of the played note, so harmonic h
// of the table sounds at h / period times the note. A table's frequency is therefore note / period.
//
// Built once per engine tree (shared with Stage blocks' inner worlds, like the Tone's bank), off the audio thread.
#include <array>
#include <span>
#include <vector>

namespace blokdust::dsp {

class TableBank {
 public:
  static constexpr int kTables = 9;
  static constexpr int kFrames = 64;
  static constexpr int kMaxPartials = 512;
  static constexpr int kBands = 10;  // 512, 256, … 1 harmonics

  /// The tables' names, in carousel order (the block's `table` param indexes these).
  static const std::array<const char*, kTables>& names() noexcept;
  /// Note cycles per table cycle (1 for harmonic tables).
  static int period(int table) noexcept;

  explicit TableBank(double sampleRate);

  /// Where a voice reads: two neighbouring frames (fade `frameMix`) of two neighbouring bands (fade `bandMix`).
  struct Read {
    const float* a0 = nullptr;  // band k, frame i
    const float* a1 = nullptr;  // band k, frame i + 1
    const float* b0 = nullptr;  // band k + 1 (fewer harmonics), frame i
    const float* b1 = nullptr;  // band k + 1, frame i + 1
    unsigned lenA = 1, lenB = 1;
    double frameMix = 0.0, bandMix = 0.0;
  };
  /// The bands for a table frequency (`tableHz` = note / period): the band with the most harmonics that stays under
  /// Nyquist, faded toward the next one up so a glide never steps.
  struct Bands { int k = 0; double mix = 0.0; };
  Bands bands(double tableHz) const noexcept;
  Read read(int table, double position, Bands b) const noexcept;

  /// One frame's waveform at `position` (0–1), band 0, at `n` points across `cycles` table cycles (0–1]: what the
  /// options panel draws. Allocates; never on the audio thread.
  static std::vector<float> picture(int table, double position, int n, double cycles);

 private:
  double nyquist_;
  std::array<unsigned, kBands> bandLen_{}, bandOffset_{};
  unsigned frameStride_ = 0;
  std::vector<float> data_;  // [table][frame][band samples …]
  const float* frame(int table, int f, int band) const noexcept {
    return data_.data() + (static_cast<std::size_t>(table) * kFrames + static_cast<std::size_t>(f)) * frameStride_ + bandOffset_[static_cast<std::size_t>(band)];
  }
};

/// A Wavetable voice's oscillator: reads a TableBank like Oscillator reads the Tone's bank. Position glides (~5 ms) to
/// where it is set so an LFO's steps never click. Phase starts at 0 like a fresh OscillatorNode.
class TableOscillator {
 public:
  void setTable(int t) noexcept { table_ = t; }
  /// Where in the table (0–1). `jump`: go there at once (a new block's first value).
  void setPosition(double p, bool jump = false) noexcept {
    posTarget_ = p < 0.0 ? 0.0 : p > 1.0 ? 1.0 : p;
    if (jump) posNow_ = posTarget_;
  }
  void setFrequency(double noteHz, const TableBank& bank, double sampleRate) noexcept;
  /// Frequency moved by `cents` this sample (Vibrato/Scuzz), the bands following it as Oscillator's do.
  double next(double cents) noexcept;
  double next() noexcept { return sample(bandsNow_, inc_); }
  void skip(int n) noexcept { for (int i = 0; i < n; ++i) advance(inc_); }
  void reset() noexcept { phase_ = 0.0; }
  void setGlide(double coeff) noexcept { posGlide_ = coeff; }

 private:
  double sample(TableBank::Bands bands, double inc) noexcept;
  void advance(double inc) noexcept {
    phase_ += inc;
    phase_ -= static_cast<double>(static_cast<long long>(phase_));  // phase ≥ 0: floor
    posNow_ += posGlide_ * (posTarget_ - posNow_);
  }
  const TableBank* bank_ = nullptr;
  int table_ = 0;
  double phase_ = 0.0, inc_ = 0.0, tableHz_ = 0.0, sampleRate_ = 48000.0;
  double posNow_ = 0.0, posTarget_ = 0.0, posGlide_ = 1.0;
  TableBank::Bands bandsNow_{};
};

}  // namespace blokdust::dsp
