// Port of Chromium's PeriodicWaveHandler::GenerateBasicWaveform / CreateBandLimitedTables and
// WaveDataForFundamentalFrequency (third_party/blink/renderer/modules/webaudio/periodic_wave_handler.cc, BSD licence,
// © The Chromium Authors; full text in NOTICE.md). Same table size, band layout, partial culling and normalisation; double-precision arithmetic.
#include "blokdust/wavetable.hpp"

#include <algorithm>
#include <cmath>
#include <complex>

#include "blokdust/dmath.hpp"

namespace blokdust::dsp {
namespace {

constexpr unsigned kBandsPerOctave = 3;
constexpr double kCentsPerRange = 1200.0 / kBandsPerOctave;

unsigned waveSize(double sampleRate) { return sampleRate <= 24000 ? 2048u : sampleRate <= 88200 ? 4096u : 16384u; }

/// In-place iterative radix-2 complex FFT, inverse direction (e^{+i...}), unscaled. Twiddles from dmath (deterministic).
void inverseFft(std::vector<std::complex<double>>& a) {
  const std::size_t n = a.size();
  for (std::size_t i = 1, j = 0; i < n; ++i) {
    std::size_t bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) std::swap(a[i], a[j]);
  }
  for (std::size_t len = 2; len <= n; len <<= 1) {
    for (std::size_t k = 0; k < len / 2; ++k) {
      const double ang = dmath::kTwoPi * static_cast<double>(k) / static_cast<double>(len);
      const std::complex<double> w(dmath::cos(ang), dmath::sin(ang));
      for (std::size_t i = 0; i < n; i += len) {
        const std::complex<double> u = a[i + k];
        const std::complex<double> v = a[i + k + len / 2] * w;
        a[i + k] = u + v;
        a[i + k + len / 2] = u - v;
      }
    }
  }
}

/// Chromium's Fourier sine coefficient b[n] for each basic shape (all odd functions, positive slope at 0).
double coefficient(Waveform w, unsigned n) {
  const double piFactor = 2.0 / (static_cast<double>(n) * dmath::kPi);
  switch (w) {
    case Waveform::Square: return (n & 1) ? 2.0 * piFactor : 0.0;
    case Waveform::Saw: return piFactor * ((n & 1) ? 1.0 : -1.0);
    case Waveform::Triangle: return (n & 1) ? 2.0 * piFactor * piFactor * ((((n - 1) >> 1) & 1) ? -1.0 : 1.0) : 0.0;
    case Waveform::Sine: default: return n == 1 ? 1.0 : 0.0;
  }
}

}  // namespace

WavetableBank::WavetableBank(double sampleRate)
    : sampleRate_(sampleRate),
      size_(waveSize(sampleRate)),
      ranges_(static_cast<unsigned>(std::lround(kBandsPerOctave * std::log2(static_cast<double>(waveSize(sampleRate)))))),
      lowestHz_(sampleRate / waveSize(sampleRate)) {
  const unsigned half = size_ / 2;
  tables_.assign(static_cast<std::size_t>(3) * ranges_ * size_, 0.0f);
  std::vector<std::complex<double>> spec(size_);
  constexpr Waveform kShapes[] = {Waveform::Square, Waveform::Triangle, Waveform::Saw};
  for (int s = 0; s < 3; ++s) {
    double norm = 1.0;
    for (unsigned r = 0; r < ranges_; ++r) {
      // Partials kept for this band: culling_scale · (size/2), the top band keeps none (Chromium: number_of_partials).
      const double culling = dmath::exp2(-(r * kCentsPerRange) / 1200.0);
      const auto partials = static_cast<unsigned>(culling * half);
      std::fill(spec.begin(), spec.end(), std::complex<double>(0.0, 0.0));
      for (unsigned nn = 1; nn < std::min(half, partials + 1); ++nn) {
        const double b = coefficient(kShapes[s], nn);
        // x[i] = Σ b_n sin(2π n i / N): spectrum −i·b/2 at +n, +i·b/2 at −n.
        spec[nn] = std::complex<double>(0.0, -0.5 * b);
        spec[size_ - nn] = std::complex<double>(0.0, 0.5 * b);
      }
      inverseFft(spec);
      // Normalise every band by the peak of band 0 (the one with all partials), as Chromium does.
      if (r == 0) {
        double peak = 0.0;
        for (const auto& c : spec) peak = std::max(peak, std::abs(c.real()));
        if (peak > 0.0) norm = 1.0 / peak;
      }
      float* dst = tables_.data() + (static_cast<std::size_t>(s) * ranges_ + r) * size_;
      for (unsigned i = 0; i < size_; ++i) dst[i] = static_cast<float>(spec[i].real() * norm);
    }
  }
}

std::span<const float> WavetableBank::table(int shape, unsigned range) const noexcept {
  return {tables_.data() + (static_cast<std::size_t>(shape) * ranges_ + range) * size_, size_};
}

WavetableBank::Lookup WavetableBank::lookup(Waveform w, double hz) const noexcept {
  hz = std::abs(hz);
  const double ratio = hz > 0.0 ? hz / lowestHz_ : 0.5;
  const double cents = dmath::log2(ratio) * 1200.0;
  const double pitchRange = std::clamp(1.0 + cents / kCentsPerRange, 0.0, static_cast<double>(ranges_ - 1));
  const auto r1 = static_cast<unsigned>(pitchRange);
  const unsigned r2 = r1 < ranges_ - 1 ? r1 + 1 : r1;
  const int shape = w == Waveform::Square ? 0 : w == Waveform::Triangle ? 1 : 2;
  return {table(shape, r1), table(shape, r2), pitchRange - r1};
}

}  // namespace blokdust::dsp
