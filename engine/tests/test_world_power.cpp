// The power switch (owner, 2026-11-11, CHG-0005): Command::worldPower(false) stops everything the
// world powers (Power and Toggle blocks, emitters, lasers; particles in flight vanish) and keeps
// what the player does (held blocks).
#include <catch2/catch_test_macros.hpp>

#include "helpers.hpp"

using namespace bdtest;

TEST_CASE(
    "World power off: a powered tone stops, an emitter stops and its particles vanish; on again, "
    "all resumes") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  e->push(Command::add(3, BlockType::PowerEmitter, 0, 20));
  e->push(Command::setParam(3, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::setParam(3, P::PowerEmitter::rate, 10));
  const auto playing = render(*e, 24000);
  CHECK(rms(playing, 12000) > 0.01);
  CHECK(!e->particles().empty());

  e->push(Command::worldPower(false));
  e->clearEvents();
  const auto off = render(*e, 48000);
  CHECK(rms(off, 12000) < 1e-4);  // the tone's release is over
  CHECK(e->particles().empty());
  CHECK(eventsOf(*e, Event::Type::Emit).empty());

  e->push(Command::press(1, true));  // the player can still play a block by holding it
  const auto held = render(*e, 24000);
  CHECK(rms(held, 12000) > 0.01);
  e->push(Command::press(1, false));
  render(*e, 48000);

  e->push(Command::worldPower(true));
  e->clearEvents();
  const auto back = render(*e, 24000);
  CHECK(rms(back, 12000) > 0.01);
  CHECK(!eventsOf(*e, Event::Type::Emit).empty());
}

TEST_CASE("World power off: a laser's beam goes out") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::PowerLaser, 0, 0));
  e->push(Command::setParam(1, P::PowerLaser::selfPoweredMode, 1));
  render(*e, 4800);
  CHECK(!e->beams().empty());
  e->push(Command::worldPower(false));
  render(*e, 4800);
  CHECK(e->beams().empty());
}
