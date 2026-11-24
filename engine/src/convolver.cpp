// fx.convolver: see convolver.hpp.
#include "blokdust/convolver.hpp"

#include <algorithm>
#include <array>
#include <cmath>

#include "blokdust/dmath.hpp"
#include "blokdust/rng.hpp"

namespace blokdust::dsp {
namespace {

constexpr int kFftMax = 2048;

/// cos/sin(2πk/2048), k < 1024, from dmath (deterministic).
struct Twiddles {
  std::array<float, kFftMax / 2> c{}, s{};
  Twiddles() {
    for (int k = 0; k < kFftMax / 2; ++k) {
      c[static_cast<std::size_t>(k)] = static_cast<float>(dmath::cos(dmath::kTwoPi * k / kFftMax));
      s[static_cast<std::size_t>(k)] = static_cast<float>(dmath::sin(dmath::kTwoPi * k / kFftMax));
    }
  }
};
// Built while the program loads (WASM: _initialize), so the audio thread never takes a
// function-local static's initialisation lock.
const Twiddles kTwiddles;
const Twiddles& twiddles() noexcept BLOKDUST_NONBLOCKING {
  return kTwiddles;
}

/// In-place radix-2 complex FFT (n a power of two ≤ 2048). Forward uses e^(−iωk); inverse is
/// unscaled.
void fft(float* re, float* im, int n, bool inverse, const Twiddles& w) noexcept {
  for (int i = 1, j = 0; i < n; ++i) {
    int bit = n >> 1;
    for (; j & bit; bit >>= 1)
      j ^= bit;
    j ^= bit;
    if (i < j) {
      std::swap(re[i], re[j]);
      std::swap(im[i], im[j]);
    }
  }
  for (int len = 2; len <= n; len <<= 1) {
    const int half = len >> 1, step = kFftMax / len;
    for (int i = 0; i < n; i += len) {
      for (int k = 0; k < half; ++k) {
        const float wr = w.c[static_cast<std::size_t>(k * step)],
                    wi = inverse ? w.s[static_cast<std::size_t>(k * step)]
                                 : -w.s[static_cast<std::size_t>(k * step)];
        const int a = i + k, b = a + half;
        const float vr = re[b] * wr - im[b] * wi, vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] = re[a] + vr;
        im[a] = im[a] + vi;
      }
    }
  }
}

/// Spectrum (bins 0..n/2) of n/2 real samples zero-padded to n.
void halfSpectrum(const float* x, int count, int n, float* re, float* im, float* outRe,
                  float* outIm, const Twiddles& w) noexcept {
  for (int i = 0; i < n; ++i) {
    re[i] = i < count ? x[i] : 0.0f;
    im[i] = 0.0f;
  }
  fft(re, im, n, false, w);
  for (int k = 0; k <= n / 2; ++k) {
    outRe[k] = re[k];
    outIm[k] = im[k];
  }
}

/// Real inverse of a half spectrum (bins 0..n/2): fills re[0..n) with the time signal, scaled by
/// 1/n.
void inverseHalf(const float* sRe, const float* sIm, int n, float* re, float* im,
                 const Twiddles& w) noexcept {
  for (int k = 0; k <= n / 2; ++k) {
    re[k] = sRe[k];
    im[k] = sIm[k];
  }
  for (int k = n / 2 + 1; k < n; ++k) {
    re[k] = sRe[n - k];
    im[k] = -sIm[n - k];
  }
  fft(re, im, n, true, w);
  const float inv = 1.0f / static_cast<float>(n);
  for (int i = 0; i < n; ++i)
    re[i] *= inv;
}

/// acc += a · b over `bins` complex values.
void macc(float* accRe, float* accIm, const float* aRe, const float* aIm, const float* bRe,
          const float* bIm, int bins) noexcept {
  for (int k = 0; k < bins; ++k) {
    accRe[k] += aRe[k] * bRe[k] - aIm[k] * bIm[k];
    accIm[k] += aRe[k] * bIm[k] + aIm[k] * bRe[k];
  }
}

}  // namespace

void ConvolutionKernel::reserve(int maxTaps) {
  maxTaps_ = std::max(maxTaps, kHeadEnd);
  maxTailParts_ = (maxTaps_ - kHeadEnd + kTailB - 1) / kTailB;
  for (int c = 0; c < 2; ++c) {
    // Padded to whole tail partitions: the last one reads a full kTailB block (zeros past the
    // response).
    ir_[c].assign(static_cast<std::size_t>(kHeadEnd + maxTailParts_ * kTailB), 0.0f);
    direct_[c].assign(kDirect, 0.0f);
    headRe_[c].assign(static_cast<std::size_t>(kHeadParts * kHeadBins), 0.0f);
    headIm_[c] = headRe_[c];
    tailRe_[c].assign(static_cast<std::size_t>(maxTailParts_ * kTailBins), 0.0f);
    tailIm_[c] = tailRe_[c];
  }
  re_.assign(kFftMax, 0.0f);
  im_.assign(kFftMax, 0.0f);
}

void ConvolutionKernel::build(const float* left, const float* right, std::uint32_t frames,
                              double irRate, double sampleRate) noexcept {
  taps_ = 0;
  tailParts_ = 0;
  if (!left || frames == 0 || maxTaps_ == 0)
    return;
  const float* src[2] = {left, right ? right : left};
  const int channels = right ? 2 : 1;
  const double step = irRate / sampleRate;
  const int taps =
      std::min(maxTaps_, static_cast<int>(std::floor(static_cast<double>(frames) / step)));
  if (taps <= 0)
    return;
  // Chromium Reverb::CalculateNormalizationScale (over the response as given; resampling barely
  // changes it).
  double power = 0.0;
  for (int c = 0; c < channels; ++c)
    for (std::uint32_t i = 0; i < frames; ++i)
      power += static_cast<double>(src[c][i]) * src[c][i];
  power = std::sqrt(power / (static_cast<double>(channels) * frames));
  if (!(power >= 0.000125))
    power = 0.000125;
  const double scale = (1.0 / power) * dmath::exp10(-58.0 * 0.05) * (44100.0 / sampleRate);
  for (int c = 0; c < 2; ++c) {
    float* ir = ir_[c].data();
    for (int n = 0; n < taps; ++n) {
      const double p = n * step;
      const auto i = static_cast<std::uint32_t>(p);
      const double f = p - i;
      const double a = src[c][i], b = i + 1 < frames ? src[c][i + 1] : 0.0;
      ir[n] = static_cast<float>((a + f * (b - a)) * scale);
    }
    for (std::size_t n = static_cast<std::size_t>(taps); n < ir_[c].size(); ++n)
      ir[n] = 0.0f;
  }
  const auto& w = twiddles();
  tailParts_ = taps > kHeadEnd ? (taps - kHeadEnd + kTailB - 1) / kTailB : 0;
  for (int c = 0; c < 2; ++c) {
    const float* ir = ir_[c].data();
    for (int j = 0; j < kDirect; ++j)
      direct_[c][static_cast<std::size_t>(j)] = j < taps ? ir[j] : 0.0f;
    for (int p = 0; p < kHeadParts; ++p)
      halfSpectrum(ir + kDirect + p * kHeadB, kHeadB, 2 * kHeadB, re_.data(), im_.data(),
                   headRe_[c].data() + p * kHeadBins, headIm_[c].data() + p * kHeadBins, w);
    for (int p = 0; p < tailParts_; ++p)
      halfSpectrum(ir + kHeadEnd + p * kTailB, kTailB, 2 * kTailB, re_.data(), im_.data(),
                   tailRe_[c].data() + p * kTailBins, tailIm_[c].data() + p * kTailBins, w);
  }
  taps_ = taps;
}

void makeDefaultImpulse(float* left, float* right, int frames, double sampleRate) noexcept {
  Pcg32 rng(0xB10CD057ULL, 0x1235ULL);
  double yl = 0.0, yr = 0.0;
  const int pre = static_cast<int>(0.012 * sampleRate);  // 12 ms pre-delay
  for (int n = 0; n < frames; ++n) {
    const double t = static_cast<double>(n) / sampleRate;
    const double nl = rng.nextFloat() * 2.0 - 1.0, nr = rng.nextFloat() * 2.0 - 1.0;
    const double cutoff = 1500.0 + 9000.0 * dmath::exp(-t * 0.9);  // highs decay faster
    const double c = dmath::exp(-dmath::kTwoPi * cutoff / sampleRate);
    yl = (1.0 - c) * nl + c * yl;
    yr = (1.0 - c) * nr + c * yr;
    const double env =
        n < pre ? 0.0
                : dmath::exp(-6.907755 * t / 2.4) * std::min(1.0, (n - pre) / (0.004 * sampleRate));
    left[n] = static_cast<float>(yl * env);
    right[n] = static_cast<float>(yr * env);
  }
}

void Convolver::reserve(int maxTailParts) {
  maxTailParts_ = std::max(1, maxTailParts);
  using K = ConvolutionKernel;
  for (auto& c : ch_) {
    c.hist.assign(K::kDirect, 0.0f);
    c.headIn.assign(2 * K::kHeadB, 0.0f);
    c.headOut.assign(K::kHeadB, 0.0f);
    c.headFdlRe.assign(static_cast<std::size_t>(K::kHeadParts * K::kHeadBins), 0.0f);
    c.headFdlIm = c.headFdlRe;
    c.tailIn.assign(2 * K::kTailB, 0.0f);
    c.tailOut.assign(K::kTailB, 0.0f);
    c.tailFdlRe.assign(static_cast<std::size_t>(maxTailParts_ * K::kTailBins), 0.0f);
    c.tailFdlIm = c.tailFdlRe;
    c.accRe.assign(K::kTailBins, 0.0f);
    c.accIm = c.accRe;
  }
  re_.assign(kFftMax, 0.0f);
  im_.assign(kFftMax, 0.0f);
}

void Convolver::reset() noexcept BLOKDUST_NONBLOCKING {
  for (auto& c : ch_)
    for (auto* v : {&c.hist, &c.headIn, &c.headOut, &c.headFdlRe, &c.headFdlIm, &c.tailIn,
                    &c.tailOut, &c.tailFdlRe, &c.tailFdlIm, &c.accRe, &c.accIm})
      std::fill(v->begin(), v->end(), 0.0f);
  histPos_ = headPos_ = tailPos_ = headFdl_ = tailFdl_ = 0;
}

void Convolver::process(const ConvolutionKernel& k, float* L, float* R, int n, double dry,
                        double wet) noexcept BLOKDUST_NONBLOCKING {
  using K = ConvolutionKernel;
  if (!k.valid() || ch_[0].hist.empty())
    return;
  const auto& w = twiddles();
  const int direct = std::min(K::kDirect, k.taps_);
  const int tailParts = std::min(k.tailParts_, maxTailParts_);
  const int perSlice = tailParts > 1 ? (tailParts - 1 + 7) / 8 : 0;
  for (int i = 0; i < n; ++i) {
    for (int c = 0; c < 2; ++c) {
      Channel& s = ch_[c];
      float* io = c ? R : L;
      const float x = io[i];
      s.hist[static_cast<std::size_t>(histPos_)] = x;
      const float* h = k.direct_[c].data();
      float y = 0.0f;
      for (int j = 0; j < direct; ++j)
        y += h[j] * s.hist[static_cast<std::size_t>((histPos_ - j) & (K::kDirect - 1))];
      y += s.headOut[static_cast<std::size_t>(headPos_)] +
           s.tailOut[static_cast<std::size_t>(tailPos_)];
      s.headIn[static_cast<std::size_t>(K::kHeadB + headPos_)] = x;
      s.tailIn[static_cast<std::size_t>(K::kTailB + tailPos_)] = x;
      io[i] = static_cast<float>(dry * x + wet * y);
    }
    histPos_ = (histPos_ + 1) & (K::kDirect - 1);
    if (++headPos_ == K::kHeadB) {  // head block complete: X → FDL, Y = Σ X·H, overlap-save
      headPos_ = 0;
      for (int c = 0; c < 2; ++c) {
        Channel& s = ch_[c];
        float* xr = s.headFdlRe.data() + headFdl_ * K::kHeadBins;
        float* xi = s.headFdlIm.data() + headFdl_ * K::kHeadBins;
        halfSpectrum(s.headIn.data(), 2 * K::kHeadB, 2 * K::kHeadB, re_.data(), im_.data(), xr, xi,
                     w);
        float yr[K::kHeadBins] = {}, yi[K::kHeadBins] = {};
        for (int p = 0; p < K::kHeadParts; ++p) {
          const int slot = (headFdl_ - p + K::kHeadParts) % K::kHeadParts;
          macc(yr, yi, s.headFdlRe.data() + slot * K::kHeadBins,
               s.headFdlIm.data() + slot * K::kHeadBins, k.headRe_[c].data() + p * K::kHeadBins,
               k.headIm_[c].data() + p * K::kHeadBins, K::kHeadBins);
        }
        inverseHalf(yr, yi, 2 * K::kHeadB, re_.data(), im_.data(), w);
        std::copy(re_.begin() + K::kHeadB, re_.begin() + 2 * K::kHeadB, s.headOut.begin());
        std::copy(s.headIn.begin() + K::kHeadB, s.headIn.end(), s.headIn.begin());
      }
      headFdl_ = (headFdl_ + 1) % K::kHeadParts;
    }
    if (tailParts == 0) {
      if (++tailPos_ == K::kTailB)
        tailPos_ = 0;
      continue;
    }
    ++tailPos_;
    if (tailPos_ == K::kTailB) {  // tail block complete: finish Y with partition 0
      tailPos_ = 0;
      for (int c = 0; c < 2; ++c) {
        Channel& s = ch_[c];
        float* xr = s.tailFdlRe.data() + tailFdl_ * K::kTailBins;
        float* xi = s.tailFdlIm.data() + tailFdl_ * K::kTailBins;
        halfSpectrum(s.tailIn.data(), 2 * K::kTailB, 2 * K::kTailB, re_.data(), im_.data(), xr, xi,
                     w);
        macc(s.accRe.data(), s.accIm.data(), xr, xi, k.tailRe_[c].data(), k.tailIm_[c].data(),
             K::kTailBins);
        inverseHalf(s.accRe.data(), s.accIm.data(), 2 * K::kTailB, re_.data(), im_.data(), w);
        std::copy(re_.begin() + K::kTailB, re_.begin() + 2 * K::kTailB, s.tailOut.begin());
        std::copy(s.tailIn.begin() + K::kTailB, s.tailIn.end(), s.tailIn.begin());
        std::fill(s.accRe.begin(), s.accRe.end(), 0.0f);
        std::fill(s.accIm.begin(), s.accIm.end(), 0.0f);
      }
      tailFdl_ = (tailFdl_ + 1) % maxTailParts_;
    }
    if (tailPos_ % 128 == 0) {  // one slice of the older partitions for the block being collected
      const int j = tailPos_ / 128, p0 = 1 + j * perSlice, p1 = std::min(tailParts, p0 + perSlice);
      for (int c = 0; c < 2; ++c) {
        Channel& s = ch_[c];
        for (int p = p0; p < p1; ++p) {
          const int slot = (tailFdl_ - p + maxTailParts_) % maxTailParts_;
          macc(s.accRe.data(), s.accIm.data(), s.tailFdlRe.data() + slot * K::kTailBins,
               s.tailFdlIm.data() + slot * K::kTailBins, k.tailRe_[c].data() + p * K::kTailBins,
               k.tailIm_[c].data() + p * K::kTailBins, K::kTailBins);
        }
      }
    }
  }
}

}  // namespace blokdust::dsp
