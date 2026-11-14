// SPEC-SIMULATION-POWER-AND-PARTICLES R7–R10: lasers.
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "helpers.hpp"

using namespace bdtest;
using Catch::Matchers::WithinAbs;

namespace {
void addLaser(Engine& e, BlockId id, double x, double y, double angle, bool self = true) {
  e.push(Command::add(id, BlockType::PowerLaser, x, y));
  e.push(Command::setParam(id, P::PowerLaser::angle, angle));
  e.push(Command::setParam(id, P::PowerLaser::selfPoweredMode, self ? 1 : 0));
}
}  // namespace

TEST_CASE("R7/R8: a running laser powers a source continuously while its beam crosses it") {
  auto e = makeEngine();
  addLaser(*e, 1, 0, 0, 0);
  e->push(Command::add(2, BlockType::SourceTone, 5, 0));
  render(*e, 48000);
  REQUIRE(e->beams().size() == 1);
  CHECK_THAT(e->beams()[0].x1, WithinAbs(275.0 / 15.0, 1e-9));  // range 275 v1 units = 18.33 grid
  CHECK(e->block(2)->gated());
  CHECK(eventsOf(*e, Event::Type::GateOn, 2).size() == 1);
  CHECK(eventsOf(*e, Event::Type::GateOff, 2).empty());
  CHECK(eventsOf(*e, Event::Type::Hit, 2).size() == 1);  // a continuous hit is reported once
}

TEST_CASE("R7: the beam stops at the nearest Void; blocks behind it are not powered (v1 order bug fixed)") {
  auto e = makeEngine();
  addLaser(*e, 1, 0, 0, 0);
  e->push(Command::add(2, BlockType::SourceTone, 6, 0));   // before the void
  e->push(Command::add(3, BlockType::PowerVoid, 10, 0));    // diamond spans x 9..11
  e->push(Command::add(4, BlockType::SourceTone, 14, 0));  // behind the void
  render(*e, 4800);
  REQUIRE(e->beams().size() == 1);
  CHECK_THAT(e->beams()[0].x1, WithinAbs(9.0, 1e-9));
  CHECK(e->block(2)->gated());
  CHECK_FALSE(e->block(4)->gated());
}

TEST_CASE("R3: a laser needs power or selfPoweredMode; v1 rotates it only while powered") {
  auto e = makeEngine();
  addLaser(*e, 1, 0, 0, 0, /*self*/ false);
  e->push(Command::setParam(1, P::PowerLaser::rotate, 400));  // 400/100 deg per v1 frame = 240 deg/s
  e->push(Command::add(2, BlockType::SourceTone, 6, 0));
  render(*e, 4800);
  CHECK(e->beams().empty());
  CHECK_FALSE(e->block(2)->gated());

  e->push(Command::add(3, BlockType::PowerPower, -3, 0));  // powers the laser → beam on and sweeping
  render(*e, 48000 * 3);
  const auto on = eventsOf(*e, Event::Type::GateOn, 2), off = eventsOf(*e, Event::Type::GateOff, 2);
  CHECK(on.size() >= 3);   // swept past the tone repeatedly (1.5 s per revolution)
  CHECK(off.size() >= 2);
  const double angle = e->block(1)->params[P::PowerLaser::angle];
  CHECK(angle <= 90.0);
  CHECK(angle >= -270.0);  // v1 wraps the angle into (−270, 90]

  auto self = makeEngine();
  addLaser(*self, 1, 0, 0, 0, true);
  self->push(Command::setParam(1, P::PowerLaser::rotate, 400));
  render(*self, 48000);
  CHECK(self->block(1)->params[P::PowerLaser::angle] == 0.0);  // self-powered only: no rotation (v1 IsPowered)
}

TEST_CASE("R8: a laser hitting a Toggle flips it once per hit, not every tick") {
  auto e = makeEngine();
  addLaser(*e, 1, -6, 0, 0);
  e->push(Command::add(2, BlockType::PowerToggle, 0, 0));
  e->push(Command::add(3, BlockType::SourceTone, 0, 5));
  render(*e, 48000);
  CHECK(eventsOf(*e, Event::Type::Logic, 2).size() == 1);
  CHECK(e->block(3)->gated());
}

TEST_CASE("R10: lasers power emitters and other lasers") {
  auto e = makeEngine();
  addLaser(*e, 1, -6, 0, 0);
  e->push(Command::add(2, BlockType::PowerEmitter, 0, 0));  // not self-powered: runs only while the beam hits it
  render(*e, 48000 * 2);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).size() >= 1);

  auto chain = makeEngine();
  addLaser(*chain, 1, -10, 0, 0);
  addLaser(*chain, 2, 0, 0, 90, false);           // hit by laser 1 → fires downwards
  chain->push(Command::add(3, BlockType::SourceTone, 0, 8));
  render(*chain, 4800);
  CHECK(chain->beams().size() == 2);
  CHECK(chain->block(3)->gated());
}

TEST_CASE("removing a laser releases the power it was supplying") {
  auto e = makeEngine();
  addLaser(*e, 1, 0, 0, 0);
  e->push(Command::add(2, BlockType::SourceTone, 5, 0));
  e->push(Command::remove(1, 24000));
  render(*e, 48000);
  CHECK_FALSE(e->block(2)->gated());
  CHECK(e->block(2)->laserPower == 0);
  CHECK(eventsOf(*e, Event::Type::GateOff, 2).size() == 1);
}
