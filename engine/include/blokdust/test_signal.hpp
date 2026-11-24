#pragma once
// Deterministic test input for golden fixtures with "input" (Audio In / FX plugin): identical on
// every platform (dmath, not libm), so the CLI, the plugin host test and the WASM build all feed
// exactly the same samples.
#include <cstdint>

#include "blokdust/dmath.hpp"

namespace blokdust::testsignal {

inline float sine(std::int64_t sample, int sampleRate, double frequency, double gain) noexcept {
  const double phase = static_cast<double>(sample % sampleRate) * frequency /
                       sampleRate;  // wrap per second: precision
  return static_cast<float>(
      gain *
      dmath::sin(dmath::kTwoPi * (phase - static_cast<double>(static_cast<std::int64_t>(phase)))));
}

}  // namespace blokdust::testsignal
