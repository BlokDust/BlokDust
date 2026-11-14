// CHG-0021 (SCOPE-0006): the Stage block: a patch inside a block. Its inner world is an Engine of its own, attached
// by the host, running in step with the outer one (SPEC-SIMULATION-POWER-AND-PARTICLES R13).
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <utility>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
std::unique_ptr<Engine> makeChild(const Engine& parent, int sr = 48000) {
  EngineConfig cfg; cfg.sampleRate = sr; cfg.child = true; cfg.parent = &parent;
  return std::make_unique<Engine>(cfg);
}
/// An outer engine with a Stage block (1) at the origin, and its inner world: a Tone (1) held by a Power (2).
struct Nested {
  std::unique_ptr<Engine> outer = makeEngine(48000, 1, false);
  std::unique_ptr<Engine> inner;
  Nested() {
    outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
    outer->prime();
    inner = makeChild(*outer);
    inner->push(Command::add(1, BlockType::SourceTone, 0, 0));
    inner->push(Command::setParam(1, P::SourceTone::waveform, 0));
    inner->push(Command::add(2, BlockType::PowerPower, -3, 0));
    REQUIRE(outer->attachStage(1, inner.get()));
  }
};
}  // namespace

TEST_CASE("R13 Stage: unpowered it is silent; powered, what is inside sounds through it") {
  Nested n;
  CHECK(rms(render(*n.outer, 24000)) == 0.0);            // nothing powers the Stage: its world is off
  CHECK_FALSE(n.inner->block(1)->gated());
  n.outer->push(Command::add(2, BlockType::PowerPower, 3, 0));   // an outer Power beside the Stage
  const auto out = render(*n.outer, 48000);
  CHECK(rms(out, 24000) > 0.01);
  CHECK(n.inner->block(1)->gated());
  CHECK(n.outer->block(1)->power() > 0);
  n.outer->push(Command::remove(2));
  const auto after = render(*n.outer, 48000);
  CHECK(rms(after, 24000) == 0.0);                        // power gone: the inner world is off again
}

TEST_CASE("R13 Stage: it sounds exactly like the same blocks on the outer stage (no master stage of its own)") {
  Nested n;
  n.outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
  const auto nested = render(*n.outer, 48000);
  auto flat = makeEngine(48000, 1, false);
  flat->push(Command::add(1, BlockType::SourceTone, 0, 0));
  flat->push(Command::setParam(1, P::SourceTone::waveform, 0));
  flat->push(Command::add(2, BlockType::PowerPower, -3, 0));
  const auto plain = render(*flat, 48000);
  // The inner Power comes on one tick after the outer one reaches the Stage; from then on the two are the same sound.
  CHECK(std::abs(rms(nested, 24000) / rms(plain, 24000) - 1.0) < 0.01);
  // Gain is plain level.
  n.outer->push(Command::setParam(1, P::SourceStage::gain, 0.5));
  const auto half = render(*n.outer, 48000);
  CHECK(std::abs(rms(half, 24000) / rms(nested, 24000) - 0.5) < 0.01);
}

TEST_CASE("R13 Stage: a particle hit is a moment of power, a held pointer holds it, outer effects apply") {
  Nested n;
  n.outer->push(Command::add(3, BlockType::PowerEmitter, -10, 0));
  n.outer->push(Command::setParam(3, P::PowerEmitter::angle, 0));
  n.outer->push(Command::setParam(3, P::PowerEmitter::selfPoweredMode, 1));
  n.outer->push(Command::setParam(3, P::PowerEmitter::rate, 60));
  n.outer->push(Command::setParam(3, P::PowerEmitter::speed, 12));
  render(*n.outer, 48000 * 3);
  const auto hits = eventsOf(*n.outer, Event::Type::Hit, 1), on = eventsOf(*n.outer, Event::Type::GateOn, 1), off = eventsOf(*n.outer, Event::Type::GateOff, 1);
  REQUIRE(hits.size() >= 2);
  CHECK(on.size() == hits.size());
  CHECK(off.size() >= hits.size() - 1);
  CHECK(off[0].sample - on[0].sample == 7200);   // v1's 0.15 s pulse
  // A press holds it.
  Nested p;
  p.outer->push(Command::press(1, true));
  CHECK(rms(render(*p.outer, 24000), 12000) > 0.01);
  p.outer->push(Command::press(1, false));
  CHECK(rms(render(*p.outer, 24000), 12000) == 0.0);
  // An outer Volume in the Stage's chain turns it down.
  Nested v, w;
  for (auto* x : {&v, &w}) x->outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
  w.outer->push(Command::add(4, BlockType::FxVolume, 0, 3));
  w.outer->push(Command::setParam(4, P::FxVolume::gain, -12));
  const double loud = rms(render(*v.outer, 48000), 24000), quiet = rms(render(*w.outer, 48000), 24000);
  CHECK(quiet < loud * 0.5);
}

TEST_CASE("R13 Stage: the inner world keeps the outer one's ticks and tempo, however the timeline is cut") {
  const auto run = [](std::uint32_t block) {
    auto outer = makeEngine(48000, 1, true);
    outer->push(Command::tempo(90));
    outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
    outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
    outer->push(Command::add(3, BlockType::FxStereoDelay, 0, 3));
    outer->prime();
    auto inner = makeChild(*outer);
    inner->push(Command::add(1, BlockType::PowerEmitter, -8, 0));
    inner->push(Command::setParam(1, P::PowerEmitter::angle, 0));
    inner->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
    inner->push(Command::setParam(1, P::PowerEmitter::sync, 1));
    inner->push(Command::setParam(1, P::PowerEmitter::division, 0.5));
    inner->push(Command::add(2, BlockType::SourceTone, 0, 0));
    inner->push(Command::add(3, BlockType::FxReverb, 3, 0));
    outer->attachStage(1, inner.get());
    outer->push(Command::tempo(140, -1.0, 48000));   // the tempo changes at 1 s: the inner emitter follows
    const auto out = render(*outer, 48000 * 3, block);
    return std::pair{hashAudio(out), inner->tickCount()};
  };
  const auto a = run(128);
  CHECK(a.second == 720);          // 3 s of ticks inside too
  CHECK(run(1024) == a);
  CHECK(run(37) == a);
}

TEST_CASE("R13 Stage: one level only; removing the block lets its world go; at most kMaxStages are attached") {
  auto outer = makeEngine(48000, 1, false);
  outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
  outer->prime();
  auto inner = makeChild(*outer);
  inner->push(Command::add(1, BlockType::SourceStage, 0, 0));
  inner->prime();
  auto deeper = makeChild(*outer);
  CHECK_FALSE(inner->attachStage(1, deeper.get()));       // a Stage inside a Stage has no world
  CHECK(outer->attachStage(1, inner.get()));
  CHECK(outer->stage(1) == inner.get());
  auto plain = makeEngine();
  CHECK_FALSE(outer->attachStage(1, plain.get()));        // only engines made as children
  outer->push(Command::remove(1));
  render(*outer, 480);
  CHECK(outer->stage(1) == nullptr);
  for (int i = 0; i <= kMaxStages; ++i) outer->push(Command::add(static_cast<BlockId>(10 + i), BlockType::SourceStage, i * 4.0, 8));
  outer->prime();
  CHECK(outer->block(10)->poolIndex >= 0);
  CHECK(outer->block(static_cast<BlockId>(10 + kMaxStages))->poolIndex < 0);
  CHECK_FALSE(outer->attachStage(static_cast<BlockId>(10 + kMaxStages), inner.get()));
}
