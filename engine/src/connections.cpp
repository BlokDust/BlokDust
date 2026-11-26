#include "blokdust/connections.hpp"

namespace blokdust {

// NOLINTNEXTLINE(readability-identifier-length): either block can be the source or effect
bool ConnectionGraph::shouldConnect(const Block& a, const Block& b) noexcept {
  if (!a.alive || !b.alive || &a == &b)
    return false;
  // A modulator (LFO, CHG-0018) connects to any block within its catchment, whatever its kind.
  if (a.kind() == BlockKind::Modulator || b.kind() == BlockKind::Modulator) {
    const double c = (a.kind() == BlockKind::Modulator ? a : b).info().catchment;
    const double dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy <= c * c;
  }
  const Block* src = nullptr;
  const Block* eff = nullptr;
  if (kindsMayConnect(a.kind(), b.kind())) {
    src = &a;
    eff = &b;
  } else if (kindsMayConnect(b.kind(), a.kind())) {
    src = &b;
    eff = &a;
  } else
    return false;
  const double c = eff->info().catchment;
  const double dx = src->x - eff->x, dy = src->y - eff->y;
  return dx * dx + dy * dy <=
         c * c;  // R1: distance <= catchment (squared: exact for grid positions)
}

void ConnectionGraph::clear() noexcept {
  for (auto& r : adj_)
    r.reset();
  since_.fill(0);
  clock_ = 0;
}

void ConnectionGraph::link(int a, int b, bool on) noexcept BLOKDUST_NONBLOCKING {
  adj_[static_cast<std::size_t>(a)][static_cast<std::size_t>(b)] = on;
  adj_[static_cast<std::size_t>(b)][static_cast<std::size_t>(a)] = on;
  since_[pair(a, b)] =
      on ? ++clock_
         : 0;  // a new connection joins the end of both blocks' orders (v1 Connections.Add)
}

bool ConnectionGraph::touch(int a, int b) noexcept BLOKDUST_NONBLOCKING {
  if (a == b || !connected(a, b))
    return false;
  since_[pair(a, b)] = ++clock_;
  return true;
}

void ConnectionGraph::rebuildAll(const std::array<Block, kMaxBlocks>& blocks) noexcept {
  clear();
  for (int i = 0; i < kMaxBlocks; ++i) {
    if (!blocks[i].alive)
      continue;
    for (int j = i + 1; j < kMaxBlocks; ++j) {
      if (shouldConnect(blocks[i], blocks[j]))
        link(i, j, true);
    }
  }
}

bool ConnectionGraph::updateSlot(const std::array<Block, kMaxBlocks>& blocks,
                                 int slot) noexcept BLOKDUST_NONBLOCKING {
  bool changed = false;
  for (int j = 0; j < kMaxBlocks; ++j) {
    if (j == slot)
      continue;
    const bool want = blocks[slot].alive && shouldConnect(blocks[slot], blocks[j]);
    if (adj_[slot][j] != want) {
      link(slot, j, want);
      changed = true;
    }
  }
  return changed;
}

void Chains::rebuild(const std::array<Block, kMaxBlocks>& blocks, const ConnectionGraph& graph,
                     const std::array<std::uint16_t, kMaxBlocks>& order,
                     int orderCount) noexcept BLOKDUST_NONBLOCKING {
  std::bitset<kMaxBlocks> chained;
  // Explicit stack reproducing recursive pre-order DFS (v1 _ParseConnections) without recursion.
  // From each block the next child is its earliest-connected neighbour not yet chained (v1 walks
  // Block.Connections in insertion order, R4a).
  std::array<std::uint16_t, kMaxBlocks> stackSlot{};
  int memberCount = 0;
  chainCount = 0;
  chainOf.fill(-1);

  for (int k = 0; k < orderCount; ++k) {
    const int start = order[k];
    if (chained[start] || isPowerEffectLike(blocks[start].kind()))
      continue;
    Range& r = chains[chainCount++];
    r.start = static_cast<std::uint16_t>(memberCount);
    int sp = 0;
    chained[start] = true;
    members[memberCount++] = static_cast<std::uint16_t>(start);
    stackSlot[sp++] = static_cast<std::uint16_t>(start);
    while (sp > 0) {
      const int cur = stackSlot[sp - 1];
      int child = -1;
      std::uint32_t first = 0;
      for (int i = 0; i < orderCount; ++i) {
        const int c = order[i];
        if (!graph.connected(cur, c) || chained[c] || isPowerEffectLike(blocks[c].kind()))
          continue;
        const std::uint32_t s = graph.since(cur, c);
        if (child < 0 || s < first) {
          child = c;
          first = s;
        }
      }
      if (child < 0) {
        --sp;
        continue;
      }
      chained[child] = true;
      members[memberCount++] = static_cast<std::uint16_t>(child);
      stackSlot[sp++] = static_cast<std::uint16_t>(child);
    }
    r.count = static_cast<std::uint16_t>(memberCount - r.start);
    for (int m = r.start; m < memberCount; ++m)
      chainOf[members[static_cast<std::size_t>(m)]] = static_cast<std::int16_t>(chainCount - 1);
  }
}

}  // namespace blokdust
