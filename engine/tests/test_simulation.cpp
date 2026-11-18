// SPEC-SIMULATION-POWER-AND-PARTICLES
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "helpers.hpp"

using namespace bdtest;
using Catch::Matchers::WithinAbs;

namespace {
constexpr int kRateTicks = 80 * kTicksPerV1Frame;  // v1 default emitter rate (80 frames) → 320 ticks = 1.333 s
constexpr std::int64_t kSamplesPerTick = 48000 / kTickRate;

/// Self-powered emitter at (ex, ey) firing right (angle 0).
void addEmitterRight(Engine& e, BlockId id, double ex, double ey) {
  e.push(Command::add(id, BlockType::PowerEmitter, ex, ey));
  e.push(Command::setParam(id, P::PowerEmitter::angle, 0.0));
  e.push(Command::setParam(id, P::PowerEmitter::selfPoweredMode, 1.0));
}
}  // namespace

TEST_CASE("R4 S1: a self-powered emitter pulses a Tone every interval with sample-accurate gates") {
  auto e = makeEngine();
  addEmitterRight(*e, 1, -10, 0);
  e->push(Command::add(2, BlockType::SourceTone, 0, -0.5));  // particle path crosses the Tone outline at x ≈ -1.5
  render(*e, 48000 * 10);

  const auto emits = eventsOf(*e, Event::Type::Emit, 1);
  const auto hits = eventsOf(*e, Event::Type::Hit, 2);
  const auto on = eventsOf(*e, Event::Type::GateOn, 2);
  const auto off = eventsOf(*e, Event::Type::GateOff, 2);
  REQUIRE(emits.size() == 7);  // ticks 319, 639, …, 2239 within 2400 ticks
  CHECK(emits[0].tick == kRateTicks - 1);  // v1: a new self-powered emitter's counter starts at 0
  for (std::size_t i = 1; i < emits.size(); ++i) CHECK(emits[i].tick - emits[i - 1].tick == kRateTicks);

  REQUIRE(hits.size() == 6);
  // speed 3 units/frame = 0.05 grid/tick; the outline edge at y=+0.5 is x=-1.5 → 8.5 grid / 0.05 ≈ 170 ticks
  CHECK(hits[0].tick - emits[0].tick >= 170);
  CHECK(hits[0].tick - emits[0].tick <= 172);
  for (std::size_t i = 1; i < hits.size(); ++i) CHECK(hits[i].tick - hits[i - 1].tick == kRateTicks);

  REQUIRE(on.size() == 6);
  REQUIRE(off.size() == 6);
  for (std::size_t i = 0; i < on.size(); ++i) {
    CHECK(on[i].tick == hits[i].tick);                 // gate opens on the hit tick
    CHECK(off[i].tick - on[i].tick == kPulseTicks);    // 0.15 s pulse (v1 Config.PulseLength)
    CHECK(on[i].sample == static_cast<std::int64_t>(on[i].tick) * kSamplesPerTick);  // events land on tick samples
  }
}

TEST_CASE("R5: Void absorbs particles before they reach the Tone") {
  auto e = makeEngine();
  addEmitterRight(*e, 1, -10, 0);
  e->push(Command::add(2, BlockType::PowerVoid, -5, 0));
  e->push(Command::add(3, BlockType::SourceTone, 0, -0.5));
  render(*e, 48000 * 5);
  CHECK(eventsOf(*e, Event::Type::Absorb, 2).size() == 3);  // emissions at ticks 319, 639, 959
  CHECK(eventsOf(*e, Event::Type::Hit).empty());
  CHECK(eventsOf(*e, Event::Type::GateOn).empty());
}

TEST_CASE("R5: particles pass through effects and Power blocks") {
  auto e = makeEngine();
  addEmitterRight(*e, 1, -10, 0);
  e->push(Command::add(2, BlockType::FxReverb, -5, 0));
  e->push(Command::add(3, BlockType::PowerPower, -2.5, 8));  // far from the path
  e->push(Command::add(4, BlockType::SourceTone, 0, -0.5));
  render(*e, 48000 * 3);
  CHECK(eventsOf(*e, Event::Type::Hit, 4).size() == 1);
}

TEST_CASE("R4: particles expire after range/speed (600/3 = 200 v1 frames = 800 ticks)") {
  auto e = makeEngine();
  addEmitterRight(*e, 1, 0, 0);
  // first emission at tick 319; switch the emitter off right after so only one particle exists
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 0.0, kRateTicks * kSamplesPerTick));
  render(*e, kSamplesPerTick * (kRateTicks - 1 + 799));
  REQUIRE(e->particles().size() == 1);
  const auto& p = e->particles()[0];
  CHECK_THAT(p.x, WithinAbs(799 * 0.05, 1e-9));  // moved once per tick since emission
  CHECK_THAT(p.y, WithinAbs(0.0, 1e-12));
  CHECK(p.size >= 2.0f);
  CHECK(p.size < 3.0f);
  render(*e, kSamplesPerTick * 2);
  CHECK(e->particles().empty());
}

TEST_CASE("R2: a Power block powers connected sources while connected") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::PowerPower, 3, 0));
  e->push(Command::move(2, 20, 0, 48000));
  render(*e, 48000 * 2);
  const auto on = eventsOf(*e, Event::Type::GateOn, 1);
  const auto off = eventsOf(*e, Event::Type::GateOff, 1);
  REQUIRE(on.size() == 1);
  REQUIRE(off.size() == 1);
  CHECK(on[0].sample == 0);
  CHECK(off[0].sample == 48000);
}

TEST_CASE("R3: an emitter connected to a Power block runs without selfPoweredMode") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  render(*e, 48000);
  CHECK(eventsOf(*e, Event::Type::Emit).empty());
  e->push(Command::add(2, BlockType::PowerPower, 2, 0));
  render(*e, 48000 * 2);
  CHECK(eventsOf(*e, Event::Type::Emit).size() == 2);  // immediately, then 320 ticks later
}

TEST_CASE("R2 S3: particle hits on a Toggle flip power to its connected sources") {
  auto e = makeEngine();
  addEmitterRight(*e, 1, -10, 0);
  e->push(Command::add(2, BlockType::PowerToggle, 0, 0));
  e->push(Command::add(3, BlockType::SourceTone, 0, 5));  // connected to the toggle, off the particle path
  render(*e, 48000 * 5);
  const auto logic = eventsOf(*e, Event::Type::Logic, 2);
  const auto on = eventsOf(*e, Event::Type::GateOn, 3);
  const auto off = eventsOf(*e, Event::Type::GateOff, 3);
  REQUIRE(logic.size() == 3);  // on, off, on
  REQUIRE(on.size() == 2);
  REQUIRE(off.size() == 1);
  CHECK(on[0].tick == logic[0].tick);
  CHECK(off[0].tick == logic[1].tick);
  CHECK(on[1].tick == logic[2].tick);
  CHECK(eventsOf(*e, Event::Type::Hit, 3).empty());
}

TEST_CASE("R2: a particle hit on a Pulse block pulses its connected sources for 0.15 s") {
  auto e = makeEngine();
  addEmitterRight(*e, 1, -10, 0);
  e->push(Command::add(2, BlockType::PowerPulse, 0, 0));
  e->push(Command::add(3, BlockType::SourceTone, 0, 5));
  render(*e, 48000 * 3);
  const auto on = eventsOf(*e, Event::Type::GateOn, 3);
  const auto off = eventsOf(*e, Event::Type::GateOff, 3);
  REQUIRE(on.size() == 1);
  REQUIRE(off.size() == 1);
  CHECK(off[0].tick - on[0].tick == kPulseTicks);
}

TEST_CASE("overlapping pulses keep a source powered until the last one ends; each hit strikes it again (SIMULATION-0008)") {
  auto e = makeEngine();
  addEmitterRight(*e, 1, -10, 0);
  addEmitterRight(*e, 2, -10, 0);  // second emitter, same path, created later
  e->push(Command::setParam(2, P::PowerEmitter::selfPoweredMode, 0.0));
  // emitter 1 fires at tick 319; emitter 2 is switched on at tick 329 and fires immediately (primed counter)
  e->push(Command::setParam(2, P::PowerEmitter::selfPoweredMode, 1.0, /*atSample*/ (kRateTicks + 9) * kSamplesPerTick));
  e->push(Command::add(3, BlockType::SourceTone, 0, -0.5));
  render(*e, 48000 * 3);
  const auto hits = eventsOf(*e, Event::Type::Hit, 3);
  const auto on = eventsOf(*e, Event::Type::GateOn, 3);
  const auto off = eventsOf(*e, Event::Type::GateOff, 3);
  REQUIRE(hits.size() >= 2);
  CHECK(hits[1].tick - hits[0].tick == 10);
  REQUIRE(on.size() >= 1);
  REQUIRE(off.size() >= 1);
  CHECK(on[0].tick == hits[0].tick);
  CHECK(off[0].tick == hits[1].tick + kPulseTicks);  // one continuous gate across both pulses
  REQUIRE(on.size() >= 2);
  CHECK(on[1].tick == hits[1].tick);                  // ... struck again by the second hit (v1 only lengthened it)
}

TEST_CASE("SIMULATION-0008: fast particles through a Random Note pick a new note on every hit") {
  auto e = makeEngine(48000, 1, false);
  addEmitterRight(*e, 1, -10, 0);
  e->push(Command::setParam(1, P::PowerEmitter::rate, 6));  // a particle every 0.1 s: closer than a pulse (0.15 s)
  e->push(Command::add(2, BlockType::SourceTone, 0, -0.5));
  e->push(Command::add(3, BlockType::FxRandomNote, 3, -0.5));
  std::vector<double> heard;
  for (int t = 0; t < 1200; ++t) {  // 3 s: the first particle takes ~0.7 s to arrive
    render(*e, 120);
    for (const auto& v : e->block(2)->voices) if (v.active && (heard.empty() || heard.back() != v.pitch)) heard.push_back(v.pitch);
  }
  const auto hits = eventsOf(*e, Event::Type::Hit, 2), on = eventsOf(*e, Event::Type::GateOn, 2);
  REQUIRE(hits.size() >= 8);
  CHECK(on.size() == hits.size());     // every hit is a strike
  CHECK(heard.size() >= hits.size() / 2);  // and mostly a different note (a pick can repeat)
}

TEST_CASE("Power Gap on hit (owner, 2026-11-14): a hit cuts its power for `gap`, so its Tone is struck again; off, hits pass") {
  const auto run = [](bool gapOnHit) {
    auto e = makeEngine(48000, 1, false);
    addEmitterRight(*e, 1, -14, 0);
    e->push(Command::add(2, BlockType::SourceTone, 0, 4));    // out of the particles' path
    e->push(Command::add(3, BlockType::PowerPower, 0, 0));     // powers the Tone, in the path
    e->push(Command::setParam(3, P::PowerPower::gapOnHit, gapOnHit ? 1 : 0));
    e->push(Command::setParam(3, P::PowerPower::gap, 0.1));
    render(*e, 48000 * 4);
    return std::move(e);
  };
  const auto on = run(true);
  const auto gateOns = eventsOf(*on, Event::Type::GateOn, 2), gateOffs = eventsOf(*on, Event::Type::GateOff, 2), cuts = eventsOf(*on, Event::Type::Logic, 3);
  REQUIRE(cuts.size() >= 2);
  CHECK(gateOns.size() == cuts.size() + 1);             // on at the start, then again after every cut
  REQUIRE(gateOffs.size() >= 1);
  CHECK(gateOffs[0].tick == cuts[0].tick);             // the cut lets go at once ...
  CHECK(gateOns[1].tick - cuts[0].tick == 24);         // ... and power comes back after 0.1 s (24 ticks)
  CHECK(eventsOf(*on, Event::Type::Hit, 3).size() == cuts.size());  // the particles stop at it
  const auto off = run(false);
  CHECK(eventsOf(*off, Event::Type::GateOn, 2).size() == 1);   // v1: the Power just holds the Tone
  CHECK(eventsOf(*off, Event::Type::Hit, 3).empty());          // particles pass through it
}

TEST_CASE("SPEC-SIMULATION-POWER-AND-PARTICLES R1b: Reset of the whole world (id 0) clears the particles in flight, in its Stages too") {
  // Clearing the stage or opening another patch (owner, 2026-11-18): the old patch's particles went on flying.
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::setParam(1, P::PowerEmitter::rate, 5));
  e->push(Command::setParam(1, P::PowerEmitter::speed, 1));
  render(*e, 24000);
  REQUIRE(e->particles().size() > 0);
  e->push(Command::remove(1));
  render(*e, 128);
  CHECK(e->particles().size() > 0);  // trashing an emitter leaves its particles flying (v1)
  e->push(Command::reset(kInvalidBlock));
  render(*e, 128);
  CHECK(e->particles().size() == 0);
}
