// SPEC-SIMULATION-POWER-AND-PARTICLES R7–R10: lasers.
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "helpers.hpp"

using namespace bdtest;
using Catch::Matchers::WithinAbs;

namespace {
void addLaser(Engine& engine, BlockId id, double x, double y, double angle, bool self = true) {
  engine.push(Command::add(id, BlockType::PowerLaser, x, y));
  engine.push(Command::setParam(id, P::PowerLaser::angle, angle));
  engine.push(Command::setParam(id, P::PowerLaser::selfPoweredMode, self ? 1 : 0));
}
}  // namespace

TEST_CASE("R7/R8: a running laser powers a source continuously while its beam crosses it") {
  auto engine = makeEngine();
  addLaser(*engine, 1, 0, 0, 0);
  engine->push(Command::add(2, BlockType::SourceTone, 5, 0));
  render(*engine, 48000);
  REQUIRE(engine->beams().size() == 1);
  CHECK_THAT(engine->beams()[0].x1,
             WithinAbs(275.0 / 15.0, 1e-9));  // range 275 v1 units = 18.33 grid
  CHECK(engine->block(2)->gated());
  CHECK(eventsOf(*engine, Event::Type::GateOn, 2).size() == 1);
  CHECK(eventsOf(*engine, Event::Type::GateOff, 2).empty());
  CHECK(eventsOf(*engine, Event::Type::Hit, 2).size() == 1);  // a continuous hit is reported once
}

TEST_CASE(
    "R7: the beam stops at the nearest Void; blocks behind it are not powered (v1 order bug "
    "fixed)") {
  auto engine = makeEngine();
  addLaser(*engine, 1, 0, 0, 0);
  engine->push(Command::add(2, BlockType::SourceTone, 6, 0));   // before the void
  engine->push(Command::add(3, BlockType::PowerVoid, 10, 0));   // diamond spans x 9..11
  engine->push(Command::add(4, BlockType::SourceTone, 14, 0));  // behind the void
  render(*engine, 4800);
  REQUIRE(engine->beams().size() == 1);
  CHECK_THAT(engine->beams()[0].x1, WithinAbs(9.0, 1e-9));
  CHECK(engine->block(2)->gated());
  CHECK_FALSE(engine->block(4)->gated());
}

TEST_CASE("R3: a laser needs power or selfPoweredMode; v1 rotates it only while powered") {
  auto engine = makeEngine();
  addLaser(*engine, 1, 0, 0, 0, /*self*/ false);
  engine->push(
      Command::setParam(1, P::PowerLaser::rotate, 400));  // 400/100 deg per v1 frame = 240 deg/s
  engine->push(Command::add(2, BlockType::SourceTone, 6, 0));
  render(*engine, 4800);
  CHECK(engine->beams().empty());
  CHECK_FALSE(engine->block(2)->gated());

  engine->push(
      Command::add(3, BlockType::PowerPower, -3, 0));  // powers the laser → beam on and sweeping
  render(*engine, 48000 * 3);
  const auto on = eventsOf(*engine, Event::Type::GateOn, 2),
             off = eventsOf(*engine, Event::Type::GateOff, 2);
  CHECK(on.size() >= 3);  // swept past the tone repeatedly (1.5 s per revolution)
  CHECK(off.size() >= 2);
  const double angle = engine->block(1)->params[P::PowerLaser::angle];
  CHECK(angle <= 90.0);
  CHECK(angle >= -270.0);  // v1 wraps the angle into (−270, 90]

  auto self = makeEngine();
  addLaser(*self, 1, 0, 0, 0, true);
  self->push(Command::setParam(1, P::PowerLaser::rotate, 400));
  render(*self, 48000);
  CHECK(self->block(1)->params[P::PowerLaser::angle] ==
        0.0);  // self-powered only: no rotation (v1 IsPowered)
}

TEST_CASE("R8: a laser hitting a Toggle flips it once per hit, not every tick") {
  auto engine = makeEngine();
  addLaser(*engine, 1, -6, 0, 0);
  engine->push(Command::add(2, BlockType::PowerToggle, 0, 0));
  engine->push(Command::add(3, BlockType::SourceTone, 0, 5));
  render(*engine, 48000);
  CHECK(eventsOf(*engine, Event::Type::Logic, 2).size() == 1);
  CHECK(engine->block(3)->gated());
}

TEST_CASE("R10: lasers power emitters and other lasers") {
  auto engine = makeEngine();
  addLaser(*engine, 1, -6, 0, 0);
  engine->push(Command::add(2, BlockType::PowerEmitter, 0,
                            0));  // not self-powered: runs only while the beam hits it
  render(*engine, 48000 * 2);
  CHECK(eventsOf(*engine, Event::Type::Emit, 2).size() >= 1);

  auto chain = makeEngine();
  addLaser(*chain, 1, -10, 0, 0);
  addLaser(*chain, 2, 0, 0, 90, false);  // hit by laser 1 → fires downwards
  chain->push(Command::add(3, BlockType::SourceTone, 0, 8));
  render(*chain, 4800);
  CHECK(chain->beams().size() == 2);
  CHECK(chain->block(3)->gated());
}

TEST_CASE("removing a laser releases the power it was supplying") {
  auto engine = makeEngine();
  addLaser(*engine, 1, 0, 0, 0);
  engine->push(Command::add(2, BlockType::SourceTone, 5, 0));
  engine->push(Command::remove(1, 24000));
  render(*engine, 48000);
  CHECK_FALSE(engine->block(2)->gated());
  CHECK(engine->block(2)->laserPower == 0);
  CHECK(eventsOf(*engine, Event::Type::GateOff, 2).size() == 1);
}

// R9a: Restart (owner, 2026-11-17): a Laser that gains power again starts from its Angle instead of
// where it stopped.
TEST_CASE(
    "R9a: with Restart, a turning laser starts again from its Angle every time it gains power") {
  auto run = [](bool restart) {
    auto engine = makeEngine();
    addLaser(*engine, 1, 0, 0, 0, /*self*/ false);
    engine->push(Command::setParam(1, P::PowerLaser::rotate, 400));  // 240 deg/s
    engine->push(Command::setParam(1, P::PowerLaser::restart, restart ? 1 : 0));
    engine->push(Command::add(2, BlockType::PowerPower, -3, 0));
    render(*engine, 12000);  // 0.25 s powered: about 60 degrees
    engine->push(Command::remove(2));
    render(*engine, 12000);  // unpowered: it stays where it stopped
    const double stopped = engine->block(1)->params[P::PowerLaser::angle];
    engine->push(Command::add(3, BlockType::PowerPower, -3, 0));
    render(*engine, 200);  // one tick powered again
    return std::pair{stopped, engine->block(1)->params[P::PowerLaser::angle]};
  };
  const auto [stoppedOff, againOff] = run(false);
  const auto [stoppedOn, againOn] = run(true);
  CHECK_THAT(stoppedOff, WithinAbs(60.0, 2.0));
  CHECK_THAT(againOff, WithinAbs(stoppedOff + 1.0, 0.01));  // carries on (v1): one tick is 1 degree
  CHECK_THAT(stoppedOn, WithinAbs(60.0, 2.0));
  CHECK_THAT(againOn, WithinAbs(1.0, 0.01));  // back at its Angle (0), then one tick on
}

TEST_CASE(
    "R9a: with Restart, a synced laser counts its turn from when it gains power, not from beat 0") {
  auto angleAfterPowerOn = [](bool restart, std::int64_t unpowered) {
    auto engine = makeEngine(48000, 1, false);
    addLaser(*engine, 1, 0, 0, 0, /*self*/ false);
    engine->push(Command::setParam(1, P::PowerLaser::sync, 1));
    engine->push(Command::setParam(1, P::PowerLaser::turnBeats, 4));  // 2 s a turn at 120 BPM
    engine->push(Command::setParam(1, P::PowerLaser::restart, restart ? 1 : 0));
    engine->push(Command::tempo(120.0));
    render(*engine, unpowered);
    engine->push(Command::add(2, BlockType::PowerPower, -3, 0));
    render(*engine, 12000);  // 0.25 s powered: an eighth of a turn
    return engine->block(1)->params[P::PowerLaser::angle];
  };
  CHECK_THAT(angleAfterPowerOn(true, 7000), WithinAbs(45.0, 1.0));
  CHECK_THAT(angleAfterPowerOn(true, 31000),
             WithinAbs(45.0, 1.0));  // the same sweep whenever it starts
  CHECK(std::abs(angleAfterPowerOn(false, 7000) - angleAfterPowerOn(false, 31000)) >
        90.0);  // without: locked to the beat
}

TEST_CASE("R9a: a laser with Restart starts each Pulse from its Angle") {
  auto engine = makeEngine();
  addLaser(*engine, 1, 0, 0, 0, /*self*/ false);
  engine->push(Command::setParam(1, P::PowerLaser::rotate, 400));  // 1 degree a tick
  engine->push(Command::setParam(1, P::PowerLaser::restart, 1));
  engine->push(Command::add(2, BlockType::PowerPulse, -3, 0));
  engine->push(Command::add(3, BlockType::PowerEmitter, -14, 0));  // its particles fire the Pulse
  engine->push(Command::setParam(3, P::PowerEmitter::angle, 0));
  engine->push(Command::setParam(3, P::PowerEmitter::selfPoweredMode, 1));
  std::vector<double> starts;  // the angle on the first tick of each turn
  double last = engine->block(1) ? engine->block(1)->params[P::PowerLaser::angle] : 0.0;
  bool moving = false;
  for (int t = 0; t < 240 * 6; ++t) {
    render(*engine, 200);
    const double a = engine->block(1)->params[P::PowerLaser::angle];
    if (a != last && !moving)
      starts.push_back(a);
    moving = a != last;
    last = a;
  }
  REQUIRE(starts.size() >= 3);
  for (double a : starts)
    CHECK_THAT(a, WithinAbs(1.0, 0.01));
}

// SIMULATION-0012 (owner, 2026-11-17): a particle that hits a Laser only hits are holding fires its
// beam again.
namespace {
/// The owner's patch: a Power runs a 1/16 Emitter (8 a second at 120 BPM, closer than a pulse) into
/// a Laser whose beam powers a second Emitter, which fires at a Tone.
std::unique_ptr<Engine> strikeRig(bool selfPowered, bool sync2) {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::tempo(120.0));
  engine->push(Command::add(1, BlockType::PowerEmitter, -1, 1));
  engine->push(Command::setParam(1, P::PowerEmitter::sync, 1));
  engine->push(Command::setParam(1, P::PowerEmitter::division, 0.25));
  engine->push(Command::add(2, BlockType::PowerPower, -5, 4));
  addLaser(*engine, 3, -1, -7, 0, selfPowered);
  engine->push(Command::add(4, BlockType::PowerEmitter, 10, -8));
  engine->push(Command::setParam(4, P::PowerEmitter::angle, 90));
  engine->push(Command::setParam(4, P::PowerEmitter::sync, sync2 ? 1 : 0));
  engine->push(Command::add(5, BlockType::SourceTone, 10, 4));
  return engine;
}
}  // namespace

TEST_CASE(
    "SIMULATION-0012: every particle on a Laser held by hits fires its beam again, and what it "
    "reaches fires") {
  auto engine = strikeRig(false, false);
  render(*engine, 48000 * 3);
  const auto laserHits = eventsOf(*engine, Event::Type::Hit, 3).size();
  CHECK(laserHits >= 18);
  CHECK(eventsOf(*engine, Event::Type::Emit, 4).size() ==
        laserHits);  // one particle from the far Emitter per hit
  CHECK(eventsOf(*engine, Event::Type::Hit, 4).size() == laserHits);
}

TEST_CASE("SIMULATION-0012: a Self Powered Laser's beam is not fired again (v1)") {
  auto engine = strikeRig(true, false);
  render(*engine, 48000 * 3);
  CHECK(eventsOf(*engine, Event::Type::Hit, 4).size() ==
        1);  // the beam arrived once, when it switched on
}

TEST_CASE("SIMULATION-0012: a beam fired again strikes the source and steps the Counter it is on") {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::tempo(120.0));
  engine->push(Command::add(1, BlockType::PowerEmitter, -1, 1));
  engine->push(Command::setParam(1, P::PowerEmitter::sync, 1));
  engine->push(Command::setParam(1, P::PowerEmitter::division, 0.25));
  engine->push(Command::add(2, BlockType::PowerPower, -5, 4));
  addLaser(*engine, 3, -1, -7, 0, false);
  engine->push(Command::add(4, BlockType::SourceTone, 6, -7));     // in the beam
  engine->push(Command::add(6, BlockType::PowerCounter, 14, -7));  // further along it
  render(*engine, 48000 * 3);
  const auto laserHits = eventsOf(*engine, Event::Type::Hit, 3).size();
  REQUIRE(laserHits >= 18);
  CHECK(eventsOf(*engine, Event::Type::GateOn, 4).size() ==
        laserHits);  // a note per particle, as SIMULATION-0008
  CHECK(eventsOf(*engine, Event::Type::Logic, 6).size() ==
        laserHits);  // a Counter step per particle
}

TEST_CASE("SIMULATION-0012: a Pulse fired again strikes the source it holds") {
  // A Pulse fired faster than its length holds a Tone: each firing is a new note.
  auto p = makeEngine(48000, 1, false);
  p->push(Command::add(1, BlockType::PowerEmitter, 0, -10));
  p->push(Command::setParam(1, P::PowerEmitter::angle, 90));
  p->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  p->push(Command::setParam(1, P::PowerEmitter::rate,
                            3));  // 3 v1 frames: 20 a second, a Pulse is 0.15 s
  p->push(Command::add(2, BlockType::PowerPulse, 0, 0));
  p->push(Command::add(3, BlockType::SourceTone, 0, 5));
  render(*p, 48000 * 3);
  const auto pulses = eventsOf(*p, Event::Type::Logic, 2).size();
  REQUIRE(pulses >= 20);
  CHECK(eventsOf(*p, Event::Type::GateOn, 3).size() ==
        pulses);  // a note per Pulse, as a particle's (SIMULATION-0008)
}
