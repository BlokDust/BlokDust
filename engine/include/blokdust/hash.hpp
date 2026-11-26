#pragma once
// Canonical hashes for golden tests (shared by unit tests, bd render, the WASM build and the plugin
// test host). audio: FNV-1a 64 over each channel's float32 bytes (little-endian), streamed
// separately (buffer-size independent),
//        combined as stereo(hL, hR) = FNV-1a of hR's 8 little-endian bytes seeded with hL
//        (CHG-0002: stereo graph).
// events: FNV-1a 64 over each event as five little-endian int64s: sample, tick, type, block, other.
#include <cstddef>
#include <cstdint>
#include <span>

#include "blokdust/engine.hpp"

namespace blokdust::hash {

inline constexpr std::uint64_t kFnvOffset = 14695981039346656037ULL;  // 0xcbf29ce484222325
inline std::uint64_t fnv1a(const void* data, std::size_t bytes,
                           std::uint64_t h = kFnvOffset) noexcept {
  const auto* p = static_cast<const unsigned char*>(data);
  for (std::size_t i = 0; i < bytes; ++i) {
    h ^= p[i];
    h *= 1099511628211ULL;
  }
  return h;
}
inline std::uint64_t audio(std::span<const float> left, std::uint64_t h = kFnvOffset) noexcept {
  return fnv1a(left.data(), left.size() * sizeof(float), h);
}
inline std::uint64_t stereo(std::uint64_t hl, std::uint64_t hr) noexcept {
  unsigned char b[8];
  for (int i = 0; i < 8; ++i)
    b[i] = static_cast<unsigned char>(hr >> (8 * i));
  return fnv1a(b, sizeof b, hl);
}
inline std::uint64_t events(std::span<const Event> evs, std::uint64_t h = kFnvOffset) noexcept {
  for (const auto& ev : evs) {
    const std::int64_t f[] = {
        ev.sample, static_cast<std::int64_t>(ev.tick), static_cast<std::int64_t>(ev.type),
        static_cast<std::int64_t>(ev.block), static_cast<std::int64_t>(ev.other)};
    h = fnv1a(f, sizeof f, h);
  }
  return h;
}

}  // namespace blokdust::hash
