// SPEC-SIMULATION-POWER-AND-PARTICLES R2b (CHG-0029, SIMULATION-0010): a Pulse can wait before it
// fires.
#include <catch2/catch_test_macros.hpp>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// A self-powered emitter firing right into a Pulse at the origin, with a Tone it powers below it
/// (as R2's test). `rateFrames`: the emitter's Fire Rate (v1 frames).
std::unique_ptr<Engine> pulseScene(double delay, double rateFrames = 80, double length = 0.15) {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::PowerEmitter, -10, 0));
  engine->push(Command::setParam(1, P::PowerEmitter::angle, 0.0));
  engine->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1.0));
  engine->push(Command::setParam(1, P::PowerEmitter::rate, rateFrames));
  engine->push(Command::add(2, BlockType::PowerPulse, 0, 0));
  engine->push(Command::setParam(2, P::PowerPulse::delay, delay));
  engine->push(Command::setParam(2, P::PowerPulse::pulseLength, length));
  engine->push(Command::add(3, BlockType::SourceTone, 0, 5));
  return engine;
}
}  // namespace

TEST_CASE("R2b: Delay 0 is v1: the Pulse powers its sources on the tick it is hit") {
  auto engine = pulseScene(0.0);
  render(*engine, 48000 * 3);
  const auto logic = eventsOf(*engine, Event::Type::Logic, 2);
  const auto on = eventsOf(*engine, Event::Type::GateOn, 3);
  REQUIRE(logic.size() == 1);
  REQUIRE(on.size() == 1);
  CHECK(on[0].tick == logic[0].tick);
}

TEST_CASE("R2b: with Delay, a hit powers the sources `delay` s later, for the pulse length") {
  auto engine = pulseScene(0.5);
  render(*engine, 48000 * 3);
  const auto logic = eventsOf(*engine, Event::Type::Logic, 2);
  const auto on = eventsOf(*engine, Event::Type::GateOn, 3);
  const auto off = eventsOf(*engine, Event::Type::GateOff, 3);
  REQUIRE(logic.size() == 1);
  REQUIRE(on.size() == 1);
  REQUIRE(off.size() == 1);
  CHECK(on[0].tick == logic[0].tick + 120);  // 0.5 s at 240 ticks/s
  CHECK(off[0].tick - on[0].tick == kPulseTicks);
}

TEST_CASE("R2b: synced, the wait is `delayBeats` at the tempo") {
  auto engine = pulseScene(0.0);
  engine->push(Command::tempo(120.0));
  engine->push(Command::setParam(2, P::PowerPulse::sync, 1.0));
  engine->push(Command::setParam(2, P::PowerPulse::pulseBeats, 0.25));
  engine->push(Command::setParam(2, P::PowerPulse::delayBeats,
                                 0.5));  // half a beat at 120 BPM = 0.25 s = 60 ticks
  engine->push(
      Command::setParam(2, P::PowerPulse::delay, 2.0));  // the free Delay is not used while synced
  render(*engine, 48000 * 3);
  const auto logic = eventsOf(*engine, Event::Type::Logic, 2);
  const auto on = eventsOf(*engine, Event::Type::GateOn, 3);
  const auto off = eventsOf(*engine, Event::Type::GateOff, 3);
  REQUIRE(logic.size() == 1);
  REQUIRE(on.size() == 1);
  REQUIRE(off.size() == 1);
  CHECK(on[0].tick == logic[0].tick + 60);
  CHECK(off[0].tick - on[0].tick == 30);  // a 1/16 (0.25 beat) pulse
}

TEST_CASE(
    "R2b: every hit keeps its own wait, so hits closer than the delay come out in the same "
    "rhythm") {
  // A particle every 0.1 s (6 frames = 24 ticks), a 1 s wait, 0.05 s pulses: ten hits are waiting
  // at once.
  auto engine = pulseScene(1.0, 6, 0.05);
  render(*engine, 48000 * 4);
  const auto logic = eventsOf(*engine, Event::Type::Logic, 2);
  const auto on = eventsOf(*engine, Event::Type::GateOn, 3);
  REQUIRE(logic.size() >= 20);
  REQUIRE(on.size() >= 12);
  for (std::size_t i = 0; i < 12; ++i)
    CHECK(on[i].tick == logic[i].tick + 240);
}

TEST_CASE("R2b: at most kMaxPulseDelays hits wait at once; more are dropped") {
  // A particle every 4 ticks with a 4 s wait: far more hits than the queue holds.
  auto engine = pulseScene(4.0, 1, 0.01);
  render(*engine, 48000 * 3);
  REQUIRE(eventsOf(*engine, Event::Type::Logic, 2).size() >
          static_cast<std::size_t>(kMaxPulseDelays));
  CHECK(engine->block(2)->pulseDelayCount == kMaxPulseDelays);
  // The first hit lands at ~0.8 s, so they fire from ~4.8 s; the hits that take the freed places
  // fire 4 s after that.
  render(*engine, 48000 * 5);
  CHECK(eventsOf(*engine, Event::Type::GateOn, 3).size() ==
        static_cast<std::size_t>(kMaxPulseDelays));
}

TEST_CASE("R2b: the world POWER switch off forgets the waiting hits") {
  auto engine = pulseScene(0.5);
  render(*engine,
         48000 * 3);  // the first hit (~2 s) has fired by 2.5 s; reset the log and catch the second
  const auto first = eventsOf(*engine, Event::Type::Logic, 2);
  REQUIRE(first.size() == 1);
  engine->clearEvents();
  // Next hit at first + 320 ticks; switch off 10 ticks after it (inside its 120-tick wait), back on
  // 20 ticks later.
  const std::int64_t hitAt = static_cast<std::int64_t>(first[0].tick + 320) * (48000 / kTickRate);
  engine->push(Command::worldPower(false, hitAt + 10 * (48000 / kTickRate)));
  engine->push(Command::worldPower(true, hitAt + 30 * (48000 / kTickRate)));
  render(*engine, 48000 * 1);
  REQUIRE(eventsOf(*engine, Event::Type::Logic, 2).size() == 1);
  CHECK(eventsOf(*engine, Event::Type::GateOn, 3).empty());
  CHECK(engine->block(2)->pulseDelayCount == 0);
}

TEST_CASE("R2b: a transport start forgets the waiting hits") {
  auto engine = pulseScene(0.5);
  render(*engine, 48000 * 3);
  const auto first = eventsOf(*engine, Event::Type::Logic, 2);
  REQUIRE(first.size() == 1);
  engine->clearEvents();
  const std::int64_t hitAt = static_cast<std::int64_t>(first[0].tick + 320) * (48000 / kTickRate);
  engine->push(
      Command::tempo(120.0, 0.0, hitAt + 10 * (48000 / kTickRate), /*transportStart*/ true));
  render(*engine, 48000 * 1);
  CHECK(eventsOf(*engine, Event::Type::GateOn, 3).empty());
}

TEST_CASE(
    "R2b scenario: a Prism splits one particle into three Pulses with growing delays: a strum") {
  // Layout of the `pulse-strum` golden: emitter → Prism (3 streams over 60°) → Pulses 20 units out,
  // each with a Tone 4 units further along its stream.
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::PowerEmitter, -10, 0));
  engine->push(Command::setParam(1, P::PowerEmitter::angle, 0.0));
  engine->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1.0));
  engine->push(Command::setParam(1, P::PowerEmitter::speed, 6));
  engine->push(Command::add(2, BlockType::PowerPrism, 0, 0));
  engine->push(Command::setParam(2, P::PowerPrism::angle, 0.0));
  engine->push(Command::setParam(2, P::PowerPrism::streams, 3));
  engine->push(Command::setParam(2, P::PowerPrism::spread, 60));
  const double delays[3] = {0.0, 0.25, 0.5};
  for (int i = 0; i < 3; ++i) {
    const double a = (-30.0 + 30.0 * i) * 3.14159265358979323846 / 180.0;
    const BlockId pulse = static_cast<BlockId>(10 + i), tone = static_cast<BlockId>(20 + i);
    engine->push(Command::add(pulse, BlockType::PowerPulse, 20 * std::cos(a), 20 * std::sin(a)));
    engine->push(Command::setParam(pulse, P::PowerPulse::delay, delays[i]));
    engine->push(Command::add(tone, BlockType::SourceTone, 24 * std::cos(a), 24 * std::sin(a)));
  }
  render(*engine, 48000 * 4);
  std::uint32_t hit[3], on[3];
  for (int i = 0; i < 3; ++i) {
    const auto l = eventsOf(*engine, Event::Type::Logic, static_cast<BlockId>(10 + i));
    const auto g = eventsOf(*engine, Event::Type::GateOn, static_cast<BlockId>(20 + i));
    REQUIRE(!l.empty());
    REQUIRE(!g.empty());
    hit[i] = l[0].tick;
    on[i] = g[0].tick;
  }
  CHECK(hit[2] - hit[0] <
        10);  // one particle, split: the three arrive together (within the outlines' difference)
  CHECK(on[0] == hit[0]);
  CHECK(on[1] == hit[1] + 60);
  CHECK(on[2] == hit[2] + 120);
}
