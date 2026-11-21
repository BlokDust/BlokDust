// CHG-0032: the Gate, a Void that power opens (SPEC-SIMULATION-POWER-AND-PARTICLES R5c, R7c; SIMULATION-0011;
// SPEC-CONNECTIONS-PROXIMITY R2d).
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "helpers.hpp"

using namespace bdtest;
using Catch::Matchers::WithinAbs;

namespace {
int count(const Engine& e, Event::Type t, BlockId b) { return static_cast<int>(eventsOf(e, t, b).size()); }
/// An emitter at (-8, 0) firing right through a Gate at the origin at a Tone at (8, 0).
std::unique_ptr<Engine> particleRig() {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerEmitter, -8, 0));
  e->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::setParam(1, P::PowerEmitter::rate, 20));
  e->push(Command::setParam(1, P::PowerEmitter::speed, 12));
  e->push(Command::add(2, BlockType::PowerGate, 0, 0));
  e->push(Command::add(3, BlockType::SourceTone, 8, 0));
  return e;
}
/// A self-powered laser at (-8, 0) aimed right through a Gate at the origin at a Tone at (8, 0).
std::unique_ptr<Engine> beamRig() {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerLaser, -8, 0));
  e->push(Command::setParam(1, P::PowerLaser::angle, 0));
  e->push(Command::setParam(1, P::PowerLaser::selfPoweredMode, 1));
  e->push(Command::add(2, BlockType::PowerGate, 0, 0));
  e->push(Command::add(3, BlockType::SourceTone, 8, 0));
  return e;
}
}  // namespace

TEST_CASE("R5c Gate: closed it absorbs particles; a Power beside it opens it and they pass") {
  auto closed = particleRig();
  render(*closed, 48000 * 3);
  REQUIRE(count(*closed, Event::Type::Emit, 1) >= 5);
  CHECK(count(*closed, Event::Type::Absorb, 2) >= 5);
  CHECK(count(*closed, Event::Type::Hit, 3) == 0);  // every particle it absorbed left it closed: hits never open it

  auto open = particleRig();
  open->push(Command::add(4, BlockType::PowerPower, 0, -4));
  render(*open, 48000 * 3);
  CHECK(open->connected(2, 4));
  CHECK(count(*open, Event::Type::Absorb, 2) == 0);
  CHECK(count(*open, Event::Type::Hit, 3) >= count(*open, Event::Type::Emit, 1) - 1);  // the last may be in flight
}

TEST_CASE("R7c Gate: a beam stops at a closed Gate, and is cut and restored as its power changes, every tick") {
  auto e = beamRig();
  render(*e, 4800);
  REQUIRE(e->beams().size() == 1);
  CHECK_THAT(e->beams()[0].x1, WithinAbs(-2.0, 1e-9));  // the Gate's left point
  CHECK_FALSE(e->block(3)->gated());
  e->push(Command::add(4, BlockType::PowerToggle, 0, -4));  // a Toggle starts off
  e->push(Command::setParam(4, P::PowerToggle::logic, 1));
  render(*e, 4800);
  CHECK(e->beams()[0].x1 > 8.0);
  CHECK(e->block(3)->gated());
  e->push(Command::setParam(4, P::PowerToggle::logic, 0));
  render(*e, 4800);
  CHECK_THAT(e->beams()[0].x1, WithinAbs(-2.0, 1e-9));
  CHECK_FALSE(e->block(3)->gated());
}

TEST_CASE("R5c Gate: Invert opens it unpowered and closes it powered") {
  auto e = beamRig();
  e->push(Command::setParam(2, P::PowerGate::invert, 1));
  render(*e, 4800);
  CHECK(e->block(3)->gated());
  e->push(Command::add(4, BlockType::PowerPower, 0, -4));
  render(*e, 4800);
  CHECK_FALSE(e->block(3)->gated());
}

TEST_CASE("R5c Gate: a Pulse opens it for the length of its pulse") {
  // A second laser hits a Pulse beside the Gate: the Gate opens for the pulse, then closes again.
  auto e = beamRig();
  e->push(Command::add(4, BlockType::PowerPulse, 0, -4));
  e->push(Command::add(5, BlockType::PowerLaser, 0, -12));
  e->push(Command::setParam(5, P::PowerLaser::angle, 90));    // down, onto the Pulse
  e->push(Command::setParam(5, P::PowerLaser::range, 135));   // 9 grid: past the Pulse, short of the Gate
  e->push(Command::setParam(5, P::PowerLaser::selfPoweredMode, 1));
  render(*e, 2400);
  CHECK(count(*e, Event::Type::Logic, 4) == 1);
  CHECK(e->block(3)->gated());                                 // open: the first beam reaches the Tone
  render(*e, 48000);
  CHECK_FALSE(e->block(3)->gated());                           // the pulse is over: closed
}

TEST_CASE("R2d (connections): a Gate connects to Power, Toggle, Pulse, Counter and Chance only") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerGate, 0, 0));
  e->push(Command::add(2, BlockType::PowerPower, 4, 0));
  e->push(Command::add(3, BlockType::PowerToggle, -4, 0));
  e->push(Command::add(4, BlockType::PowerPulse, 0, 4));
  e->push(Command::add(5, BlockType::PowerCounter, 0, -4));
  e->push(Command::add(6, BlockType::PowerChance, 3, 3));
  e->push(Command::add(7, BlockType::SourceTone, -3, -3));
  e->push(Command::add(8, BlockType::FxFilter, -3, 3));
  e->push(Command::add(9, BlockType::PowerEmitter, 3, -3));
  settle(*e);
  for (BlockId id : {2u, 3u, 4u, 5u, 6u}) CHECK(e->connected(1, id));
  for (BlockId id : {7u, 8u, 9u}) CHECK_FALSE(e->connected(1, id));
}
