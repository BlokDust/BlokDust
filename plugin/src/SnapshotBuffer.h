#pragma once
// Lock-free triple buffer: the audio thread publishes UI snapshots, the message thread reads the newest one.
// Neither side ever blocks or allocates.
#include <array>
#include <atomic>
#include <cstdint>

#include "blokdust/config.hpp"

namespace blokdust::plugin {

struct Snapshot {
  std::uint64_t seq = 0;
  int particleCount = 0;
  std::array<float, kMaxParticles * 3> particles{};
  int pairCount = 0;
  std::array<std::uint32_t, kMaxBlocks * 8 * 2> pairs{};
  int poweredCount = 0;
  std::array<std::uint32_t, kMaxBlocks> powered{};
  int beamCount = 0;
  std::array<float, kMaxBlocks * 4> beams{};
  int playheadCount = 0;                     // sampler playheads [blockId, seconds]* (the open panel's playback lines)
  std::array<float, 64 * 2> playheads{};
};

class SnapshotBuffer {
 public:
  /// Writer (audio thread): fill the returned buffer, then call publish().
  Snapshot& writeBuffer() noexcept { return bufs_[static_cast<std::size_t>(write_)]; }
  void publish() noexcept {
    const int prev = middle_.exchange(write_ | kDirty, std::memory_order_acq_rel);
    write_ = prev & kIndex;
  }
  /// Reader (message thread): newest published snapshot, or nullptr if nothing new since the last call.
  const Snapshot* read() noexcept {
    if (!(middle_.load(std::memory_order_acquire) & kDirty)) return nullptr;
    const int prev = middle_.exchange(read_, std::memory_order_acq_rel);
    read_ = prev & kIndex;
    return &bufs_[static_cast<std::size_t>(read_)];
  }

 private:
  static constexpr int kDirty = 4, kIndex = 3;
  std::array<Snapshot, 3> bufs_{};
  int write_ = 0, read_ = 1;
  std::atomic<int> middle_{2};
};

}  // namespace blokdust::plugin
