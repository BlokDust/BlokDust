#pragma once
#include <cmath>
#include <cstdint>
#include <memory>
#include <vector>

#include "blokdust/engine.hpp"
#include "blokdust/hash.hpp"

namespace bdtest {

using namespace blokdust;
namespace P = gen::param;

inline std::unique_ptr<Engine> makeEngine(int sampleRate = 48000, std::uint64_t seed = 1, bool compressor = true) {
  return std::make_unique<Engine>(EngineConfig{sampleRate, seed, compressor});
}

/// Render `frames` samples in chunks of `block` and return the left channel (engine output is mono-duplicated).
inline std::vector<float> render(Engine& e, std::int64_t frames, std::uint32_t block = 128) {
  std::vector<float> out(static_cast<std::size_t>(frames)), right(block);
  std::int64_t done = 0;
  while (done < frames) {
    const auto n = static_cast<std::uint32_t>(std::min<std::int64_t>(block, frames - done));
    e.process(out.data() + done, right.data(), n);
    done += n;
  }
  return out;
}

inline std::uint64_t hashAudio(const std::vector<float>& v) { return hash::audio(v); }
inline std::uint64_t hashEvents(const Engine& e) { return hash::events(e.events()); }

inline double rms(const std::vector<float>& v, std::size_t from = 0, std::size_t to = SIZE_MAX) {
  to = std::min(to, v.size());
  double s = 0;
  for (std::size_t i = from; i < to; ++i) s += double(v[i]) * v[i];
  return to > from ? std::sqrt(s / double(to - from)) : 0.0;
}

inline std::vector<Event> eventsOf(const Engine& e, Event::Type t, BlockId block = kInvalidBlock) {
  std::vector<Event> out;
  for (const auto& ev : e.events()) if (ev.type == t && (block == kInvalidBlock || ev.block == block)) out.push_back(ev);
  return out;
}

/// Apply queued commands by running exactly one tick boundary.
inline void settle(Engine& e) { render(e, 1, 1); }

}  // namespace bdtest
