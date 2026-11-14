// SPEC-CONNECTIONS-PROXIMITY
#include <catch2/catch_test_macros.hpp>

#include "helpers.hpp"

using namespace bdtest;

TEST_CASE("R1 S1: Tone (0,0) and Filter (4,-2) connect (fixture proximity-chain)") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::FxFilter, 4, -2));
  settle(*e);
  CHECK(e->connected(1, 2));
  CHECK(e->connected(2, 1));
}

TEST_CASE("R1 S2: Noise (-10,5) and Reverb (-6,8) connect at exactly 5 grid units") {
  auto e = makeEngine();
  e->push(Command::add(3, BlockType::SourceNoise, -10, 5));
  e->push(Command::add(4, BlockType::FxReverb, -6, 8));
  settle(*e);
  CHECK(e->connected(3, 4));
}

TEST_CASE("R1: catchment boundary is inclusive (<= 6 grid units)") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::FxFilter, 6, 0));
  e->push(Command::add(3, BlockType::SourceTone, 0, 20));
  e->push(Command::add(4, BlockType::FxFilter, 6.01, 20));
  settle(*e);
  CHECK(e->connected(1, 2));
  CHECK_FALSE(e->connected(3, 4));
}

TEST_CASE("R2 S3: power sources only connect to power effects, logic and keyboards") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  e->push(Command::add(2, BlockType::FxReverb, 2, 0));
  e->push(Command::add(3, BlockType::PowerPower, -2, 0));
  e->push(Command::add(4, BlockType::PowerToggle, 0, 2));
  e->push(Command::add(5, BlockType::InputComputerKeyboard, 0, -2));
  e->push(Command::add(6, BlockType::PowerLaser, 1, 1));
  settle(*e);
  CHECK_FALSE(e->connected(1, 2));  // emitter ↛ audio effect
  CHECK(e->connected(1, 3));        // emitter → power
  CHECK(e->connected(1, 4));        // emitter → toggle (logic)
  CHECK(e->connected(1, 5));        // emitter → keyboard (owner review 2, beyond v1)
  CHECK_FALSE(e->connected(1, 6));  // two sources never connect
  CHECK(e->connected(6, 3));        // laser → power
}

TEST_CASE("R3: audio sources connect to every effect-side kind; like never connects to like; Void connects to nothing") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::PowerPower, 2, 0));
  e->push(Command::add(3, BlockType::InputMidiController, -2, 0));
  e->push(Command::add(4, BlockType::FxEnvelope, 0, 2));
  e->push(Command::add(5, BlockType::SourceNoise, 0, -2));
  e->push(Command::add(6, BlockType::FxReverb, 3, 3));
  e->push(Command::add(7, BlockType::PowerVoid, 1, 0));
  settle(*e);
  CHECK(e->connected(1, 2));
  CHECK(e->connected(1, 3));
  CHECK(e->connected(1, 4));
  CHECK_FALSE(e->connected(1, 5));  // source-source
  CHECK_FALSE(e->connected(2, 6));  // effect-effect
  for (BlockId other = 1; other <= 6; ++other) CHECK_FALSE(e->connected(7, other));
}

TEST_CASE("R5 S4: moving a block across the catchment boundary connects/disconnects it, logged at the tick boundary") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::FxFilter, 4, -2));
  e->push(Command::move(2, 6.1, 0, /*atSample*/ 4800));
  e->push(Command::move(2, 5, 0, /*atSample*/ 9600));
  render(*e, 12000);
  const auto dis = eventsOf(*e, Event::Type::Disconnect);
  const auto con = eventsOf(*e, Event::Type::Connect);
  REQUIRE(dis.size() == 1);
  REQUIRE(con.size() == 2);
  CHECK(dis[0].sample == 4800);  // 4800 is a tick boundary at 48 kHz (200 samples/tick)
  CHECK(con[1].sample == 9600);
  CHECK(e->connected(1, 2));
}

TEST_CASE("R5: incremental per-block updates always equal a full O(n^2) rebuild") {
  auto e = makeEngine();
  Pcg32 rng(7);
  const int n = 80;
  auto coord = [&] { return std::floor(rng.nextFloat() * 30.0f) - 15.0; };
  for (int i = 1; i <= n; ++i) {
    const auto t = static_cast<BlockType>(rng.next() % gen::kBlockTypeCount);
    e->push(Command::add(static_cast<BlockId>(i), t, coord(), coord()));
  }
  settle(*e);
  for (int step = 0; step < 400; ++step) {
    const auto id = static_cast<BlockId>(1 + rng.next() % n);
    e->push(Command::move(id, coord(), coord()));
    if (step % 50 == 0) e->push(Command::remove(id));
    if (step % 50 == 1) e->push(Command::add(id, BlockType::SourceTone, coord(), coord()));
    render(*e, 200, 200);  // one tick
    ConnectionGraph full;
    full.rebuildAll(e->blocks());
    REQUIRE(full == e->graph());
  }
}

TEST_CASE("R4: chains are connected components in v1 DFS order, excluding power-effect-like blocks") {
  auto e = makeEngine();
  // T1 — F1 — T2 — F2 in a row, plus a Power block next to T1 (excluded from chains)
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::FxFilter, 4, 0));
  e->push(Command::add(3, BlockType::SourceTone, 8, 0));
  e->push(Command::add(4, BlockType::FxReverb, 12, 0));
  e->push(Command::add(5, BlockType::PowerPower, 0, 3));
  e->push(Command::add(6, BlockType::SourceNoise, 40, 40));  // isolated: its own chain
  settle(*e);
  const auto& ch = e->chains();
  REQUIRE(ch.chainCount == 2);
  const auto r = ch.chains[0];
  REQUIRE(r.count == 4);
  std::vector<BlockId> ids;
  for (int i = 0; i < r.count; ++i) ids.push_back(e->blocks()[ch.members[r.start + i]].id);
  CHECK(ids == std::vector<BlockId>{1, 2, 3, 4});
  CHECK(ch.chains[1].count == 1);
}

TEST_CASE("removing a block removes its connections and logs disconnects") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::FxFilter, 2, 0));
  e->push(Command::add(3, BlockType::FxReverb, -2, 0));
  e->push(Command::remove(1, 400));
  render(*e, 800);
  CHECK(e->block(1) == nullptr);
  CHECK(eventsOf(*e, Event::Type::Disconnect).size() == 2);
  ConnectionGraph full;
  full.rebuildAll(e->blocks());
  CHECK(full == e->graph());
}

namespace {
/// One tick: queued commands apply at the next tick boundary (200 samples at 48 kHz).
void tick(Engine& e) { render(e, 200, 200); }
std::vector<BlockId> chainOf(const Engine& e, BlockId first) {
  const auto& ch = e.chains();
  for (int c = 0; c < ch.chainCount; ++c) {
    const auto r = ch.chains[c];
    std::vector<BlockId> ids;
    for (int i = 0; i < r.count; ++i) ids.push_back(e.blocks()[ch.members[r.start + i]].id);
    if (!ids.empty() && ids[0] == first) return ids;
  }
  return {};
}
}  // namespace

TEST_CASE("R4a (owner, 2026-11-12): a source's effects run in the order they connected, as in v1") {
  // Tone, Bit Crusher and Stereo Delay are made apart; the crusher is brought in first, then the delay.
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::FxBitCrusher, 40, 0));
  e->push(Command::add(3, BlockType::FxStereoDelay, 80, 0));
  e->push(Command::move(2, 3, 0));
  tick(*e);
  e->push(Command::move(3, -3, 0));
  tick(*e);
  CHECK(chainOf(*e, 1) == std::vector<BlockId>{1, 2, 3});  // tone → crusher → delay
  // Disconnect the crusher: tone → delay. Reconnect it: it joins the end, tone → delay → crusher.
  e->push(Command::move(2, 40, 0));
  tick(*e);
  CHECK(chainOf(*e, 1) == std::vector<BlockId>{1, 3});
  e->push(Command::move(2, 3, 0));
  tick(*e);
  CHECK(chainOf(*e, 1) == std::vector<BlockId>{1, 3, 2});
  // Moving a still-connected effect keeps its place.
  e->push(Command::move(3, -2, 1));
  tick(*e);
  CHECK(chainOf(*e, 1) == std::vector<BlockId>{1, 3, 2});  // connections() lists the pairs oldest first: what the UI saves as the patch's `connectionOrder`.
  std::array<std::uint32_t, 8> pairs{};
  REQUIRE(e->connections(pairs.data(), 4) == 2);
  CHECK(std::vector<std::uint32_t>(pairs.begin(), pairs.begin() + 4) == std::vector<std::uint32_t>{1, 3, 1, 2});
}

TEST_CASE("R4a: Relink replays a saved connection order (patch `connectionOrder`)") {
  // Loaded together, the pairs connect in creation order (crusher, delay); the saved order puts the delay first.
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::FxBitCrusher, 3, 0));
  e->push(Command::add(3, BlockType::FxStereoDelay, -3, 0));
  e->push(Command::relink(1, 3));
  e->push(Command::relink(1, 2));
  tick(*e);
  CHECK(chainOf(*e, 1) == std::vector<BlockId>{1, 3, 2});
}
