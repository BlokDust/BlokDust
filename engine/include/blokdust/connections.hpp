#pragma once
// Proximity connections (SPEC-CONNECTIONS-PROXIMITY) and audio chains (v1 AccumulativeConnectionMethod).
#include <array>
#include <bitset>
#include <cstdint>

#include "blokdust/world.hpp"

namespace blokdust {

class ConnectionGraph {
 public:
  using Row = std::bitset<kMaxBlocks>;

  /// R1–R3: are blocks a and b connected given their kinds, positions and the effect's catchment?
  static bool shouldConnect(const Block& a, const Block& b) noexcept;

  void clear() noexcept;
  /// Recompute every pair (reference implementation; O(n²)).
  void rebuildAll(const std::array<Block, kMaxBlocks>& blocks) noexcept;
  /// R5: re-evaluate only pairs involving `slot` (after it was added, moved or removed). Returns true if anything changed.
  bool updateSlot(const std::array<Block, kMaxBlocks>& blocks, int slot) noexcept;

  bool connected(int a, int b) const noexcept { return adj_[static_cast<std::size_t>(a)][static_cast<std::size_t>(b)]; }
  const Row& row(int slot) const noexcept { return adj_[static_cast<std::size_t>(slot)]; }
  /// R4a: when the pair last connected (a counter, larger = later); 0 when not connected.
  std::uint32_t since(int a, int b) const noexcept { return since_[pair(a, b)]; }
  /// R4a: Relink: a connected pair counts as connected now (replays a saved `connectionOrder`). False if not connected.
  bool touch(int a, int b) noexcept;
  /// Compares connections only (not their order: a full rebuild orders pairs by slot).
  bool operator==(const ConnectionGraph& o) const noexcept { return adj_ == o.adj_; }

 private:
  static std::size_t pair(int a, int b) noexcept {
    const auto lo = static_cast<std::size_t>(a < b ? a : b), hi = static_cast<std::size_t>(a < b ? b : a);
    return lo * kMaxBlocks + hi;
  }
  void link(int a, int b, bool on) noexcept;
  std::array<Row, kMaxBlocks> adj_{};
  std::array<std::uint32_t, static_cast<std::size_t>(kMaxBlocks) * kMaxBlocks> since_{};  // 1 MB; lives in the Engine
  std::uint32_t clock_ = 0;
};

/// Audio chains: connected components of the proximity graph, excluding power-effect-like blocks.
/// Each chain sums its audio sources into its post effects in series (DFS order), then to master.
struct Chains {
  struct Range { std::uint16_t start = 0, count = 0; };
  std::array<std::uint16_t, kMaxBlocks> members{};  // slots, chain by chain, DFS order
  std::array<Range, kMaxBlocks> chains{};
  std::array<std::int16_t, kMaxBlocks> chainOf{};  // slot → chain index, −1 when in no chain
  int chainCount = 0;

  /// `order` lists alive slots in creation order: it picks where each DFS starts (v1 App.Blocks). From a block, the DFS
  /// visits its neighbours in the order they connected to it (v1 Block.Connections, R4a).
  void rebuild(const std::array<Block, kMaxBlocks>& blocks, const ConnectionGraph& g,
               const std::array<std::uint16_t, kMaxBlocks>& order, int orderCount) noexcept;
};

}  // namespace blokdust
