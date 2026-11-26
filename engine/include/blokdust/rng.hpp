#pragma once
// PCG32 (O'Neill): small, fast, fully deterministic across platforms.
#include <cstdint>

namespace blokdust {

class Pcg32 {
 public:
  explicit Pcg32(std::uint64_t seed = 0x853c49e6748fea9bULL,
                 std::uint64_t seq = 0xda3e39cb94b95bdbULL) noexcept {
    state_ = 0;
    inc_ = (seq << 1u) | 1u;
    next();
    state_ += seed;
    next();
  }
  std::uint32_t next() noexcept {
    const std::uint64_t old = state_;
    state_ = old * 6364136223846793005ULL + inc_;
    const auto xorshifted = static_cast<std::uint32_t>(((old >> 18u) ^ old) >> 27u);
    const auto rot = static_cast<std::uint32_t>(old >> 59u);
    return (xorshifted >> rot) | (xorshifted << ((32u - rot) & 31u));
  }
  /// Uniform in [0, 1) with 24 bits of precision (exactly representable as float).
  float nextFloat() noexcept { return static_cast<float>(next() >> 8) * (1.0f / 16777216.0f); }

 private:
  std::uint64_t state_;
  std::uint64_t inc_;
};

}  // namespace blokdust
