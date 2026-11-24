#pragma once

#include "blokdust/realtime.hpp"
// fx.convolver (v1 ConvolutionReverb = Tone.Convolver = a Chromium ConvolverNode): stereo
// convolution with an impulse response, Chromium's normalisation (ConvolverNode.normalize = true),
// zero latency. Deterministic (own radix-2 FFT with dmath twiddles, IEEE float ops, no
// std::complex) and allocation-free after construction:
//   taps [0, 128)      direct form (per sample)
//   taps [128, 1024)   uniform partitioned FFT, 128-sample blocks (FFT 256)
//   taps [1024, end)   uniform partitioned FFT, 1024-sample blocks (FFT 2048); the older partitions
//   are summed a
//                      slice at a time on every 128-sample boundary so no single render quantum
//                      takes the whole cost
// A stage with block size B whose taps start at ≥ B delivers each output block on time, so the sum
// has no latency.
#include <cstdint>
#include <span>
#include <vector>

namespace blokdust::dsp {

/// The spectra of one impulse response (both channels), built off the hot path (construction, or
/// attach).
class ConvolutionKernel {
 public:
  static constexpr int kDirect = 128, kHeadB = 128, kHeadEnd = 1024, kTailB = 1024;
  static constexpr int kHeadParts = (kHeadEnd - kDirect) / kHeadB;  // 7
  static constexpr int kHeadBins = kHeadB + 1, kTailBins = kTailB + 1;
  /// Reserve room for impulse responses up to `maxTaps` (allocates; construction only).
  void reserve(int maxTaps);
  /// Build from an impulse response (mono when right == nullptr), resampled linearly from `irRate`
  /// to `sampleRate`, truncated to the reserved length, scaled as Chromium's ConvolverNode
  /// normalises. Allocation-free.
  void build(const float* left, const float* right, std::uint32_t frames, double irRate,
             double sampleRate) noexcept;
  bool valid() const noexcept { return taps_ > 0; }
  int tailParts() const noexcept { return tailParts_; }
  int maxTailParts() const noexcept { return maxTailParts_; }

 private:
  friend class Convolver;
  int taps_ = 0, maxTaps_ = 0, tailParts_ = 0, maxTailParts_ = 0;
  std::vector<float> ir_[2];      // resampled, normalised impulse response (scratch for build)
  std::vector<float> direct_[2];  // taps [0, 128)
  std::vector<float> headRe_[2], headIm_[2];  // kHeadParts × kHeadBins
  std::vector<float> tailRe_[2], tailIm_[2];  // maxTailParts × kTailBins
  std::vector<float> re_, im_;                // FFT scratch
};

/// v2's built-in impulse response (v1's default, Teufelsberg from files.blokdust.io, is gone): a
/// deterministic stereo hall, decorrelated noise under a 2.4 s RT60 with high frequencies dying
/// faster. Writes `frames` samples.
void makeDefaultImpulse(float* left, float* right, int frames, double sampleRate) noexcept;

/// One convolver's running state (FDLs, overlap buffers). Pool-owned; the block points at a kernel.
class Convolver {
 public:
  void reserve(int maxTailParts);
  void reset() noexcept BLOKDUST_NONBLOCKING;
  /// In place: L/R ← dry·x + wet·(x ∗ ir). `kernel` may change between calls (a new IR loaded).
  void process(const ConvolutionKernel& k, float* L, float* R, int n, double dry,
               double wet) noexcept BLOKDUST_NONBLOCKING;

 private:
  struct Channel {
    std::vector<float> hist;  // direct: last 128 inputs (ring)
    std::vector<float> headIn, headOut, headFdlRe,
        headFdlIm;  // headIn holds 2·B (previous + current block)
    std::vector<float> tailIn, tailOut, tailFdlRe, tailFdlIm, accRe, accIm;
  };
  Channel ch_[2];
  int histPos_ = 0, headPos_ = 0, tailPos_ = 0, headFdl_ = 0, tailFdl_ = 0, maxTailParts_ = 0;
  std::vector<float> re_, im_;  // FFT scratch (2048)
};

}  // namespace blokdust::dsp
