// CHG-0015: the Prism (SPEC-SIMULATION-POWER-AND-PARTICLES R5d, R7a; SIMULATION-0006). The Counter
// is in test_counter.cpp, the Chance in test_chance.cpp.
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <string>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// A self-powered emitter at the origin firing right every 20 v1 frames (1/3 s), fast particles.
std::unique_ptr<Engine> emitterRight(int rate = 20) {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  engine->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  engine->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  engine->push(Command::setParam(1, P::PowerEmitter::rate, rate));
  engine->push(Command::setParam(1, P::PowerEmitter::speed, 12));
  return engine;
}
int count(const Engine& engine, Event::Type t, BlockId b = kInvalidBlock) {
  return static_cast<int>(eventsOf(engine, t, b).size());
}
}  // namespace

TEST_CASE(
    "R5d Prism: a particle leaves as its streams, fanned across the spread around the angle") {
  auto engine = emitterRight(600);  // one particle in this test
  engine->push(Command::setParam(1, P::PowerEmitter::rate, 30));
  engine->push(Command::add(2, BlockType::PowerPrism, 6, 0));
  engine->push(Command::setParam(2, P::PowerPrism::angle, -90));  // up
  engine->push(Command::setParam(2, P::PowerPrism::streams, 3));
  engine->push(Command::setParam(2, P::PowerPrism::spread, 90));
  engine->push(
      Command::setParam(1, P::PowerEmitter::selfPoweredMode, 0, 30000));  // stop after the first
  // Run until the split, then look at the three particles.
  for (int i = 0; i < 400 && count(*engine, Event::Type::Split, 2) == 0; ++i)
    render(*engine, 200);
  REQUIRE(count(*engine, Event::Type::Split, 2) == 1);
  REQUIRE(engine->particles().size() == 3);
  render(*engine, 200 * 20);  // 20 ticks on
  const auto ps = engine->particles();
  REQUIRE(ps.size() == 3);
  const double want[3] = {-135.0, -90.0, -45.0};
  for (int k = 0; k < 3; ++k) {
    const double a = std::atan2(ps[static_cast<std::size_t>(k)].y - 0.0,
                                ps[static_cast<std::size_t>(k)].x - 6.0) *
                     180.0 / 3.141592653589793;
    CHECK(std::abs(a - want[k]) < 0.01);
    // same speed as the particle that came in: 12 units/frame = 0.2 grid/tick
    CHECK(std::abs(
              std::hypot(ps[static_cast<std::size_t>(k)].vx, ps[static_cast<std::size_t>(k)].vy) -
              0.2) < 1e-9);
  }
}

TEST_CASE(
    "R5d Prism: streams keep the range the particle had left, so two facing Prisms do not loop "
    "forever") {
  auto engine = emitterRight(600);
  engine->push(Command::setParam(1, P::PowerEmitter::rate, 30));
  engine->push(Command::setParam(1, P::PowerEmitter::range,
                                 600));  // 50 frames at speed 12 = 200 ticks = 40 grid
  engine->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 0, 30000));
  engine->push(Command::add(2, BlockType::PowerPrism, 6, 0));
  engine->push(Command::setParam(2, P::PowerPrism::angle, 0));  // on to the right
  engine->push(Command::add(3, BlockType::PowerPrism, 16, 0));
  engine->push(Command::setParam(3, P::PowerPrism::angle, 180));  // back to the left
  render(*engine, 48000 * 3);
  CHECK(engine->particles().empty());
  const int splits = count(*engine, Event::Type::Split);
  CHECK(splits >= 2);  // it bounced
  CHECK(splits <= 5);  // 40 grid of range, 10 grid a leg
}

TEST_CASE("R7a: a Prism carries a laser's beam on, split, with the length it had left") {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::PowerLaser, 0, 0));
  engine->push(Command::setParam(1, P::PowerLaser::angle, 0));
  engine->push(Command::setParam(1, P::PowerLaser::selfPoweredMode, 1));
  engine->push(Command::setParam(1, P::PowerLaser::range, 300));  // 20 grid
  engine->push(Command::add(2, BlockType::PowerPrism, 8, 0));
  engine->push(Command::setParam(2, P::PowerPrism::angle, -90));
  engine->push(Command::setParam(2, P::PowerPrism::streams, 2));
  engine->push(Command::setParam(2, P::PowerPrism::spread, 180));  // left and right of up: along ±x
  engine->push(Command::add(3, BlockType::SourceTone, 8, -6));  // straight up: not on either stream
  engine->push(Command::add(4, BlockType::SourceTone, 14, 0));  // on the right-hand stream
  engine->push(Command::add(5, BlockType::SourceTone, 30, 0));  // beyond what is left of the beam
  render(*engine, 4800);
  CHECK(engine->beams().size() == 3);
  CHECK(engine->block(4)->laserPower == 1);
  CHECK(engine->block(3)->laserPower == 0);
  CHECK(engine->block(5)->laserPower == 0);
  // The stream to the right ends 20 − 7 = 13 grid from the prism (the beam met its edge at x = 7).
  double far = 0;
  for (const auto& b : engine->beams())
    far = std::max(far, b.x1);
  CHECK(std::abs(far - 21.0) < 1e-6);
}

TEST_CASE(
    "R7a: beams never pass the same Prism twice, and one laser casts a bounded number of beams") {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::PowerLaser, 0, 0));
  engine->push(Command::setParam(1, P::PowerLaser::angle, 0));
  engine->push(Command::setParam(1, P::PowerLaser::selfPoweredMode, 1));
  engine->push(Command::setParam(1, P::PowerLaser::range, 1200));
  // Two Prisms pointing at each other, each splitting four ways.
  engine->push(Command::add(2, BlockType::PowerPrism, 6, 0));
  engine->push(Command::setParam(2, P::PowerPrism::angle, 0));
  engine->push(Command::setParam(2, P::PowerPrism::streams, 4));
  engine->push(Command::setParam(2, P::PowerPrism::spread, 10));
  engine->push(Command::add(3, BlockType::PowerPrism, 16, 0));
  engine->push(Command::setParam(3, P::PowerPrism::angle, 180));
  engine->push(Command::setParam(3, P::PowerPrism::streams, 4));
  engine->push(Command::setParam(3, P::PowerPrism::spread, 10));
  render(*engine, 4800);
  CHECK(engine->beams().size() <= static_cast<std::size_t>(kMaxBeamSegments));
  CHECK(engine->beams().size() >= 5);
}

TEST_CASE("CHG-0015: a Prism connects to nothing") {
  auto engine = emitterRight();
  engine->push(Command::add(3, BlockType::SourceTone, 9, 4));
  engine->push(Command::add(4, BlockType::PowerPower, 6, -4));
  engine->push(Command::add(5, BlockType::PowerPrism, 3, 4));
  settle(*engine);
  CHECK_FALSE(engine->connected(5, 3));
  CHECK_FALSE(engine->connected(5, 4));
}

TEST_CASE(
    "R12 (CHG-0015): Counter, Chance and Prism render bit-identically whatever the buffer size") {
  const auto run = [](std::uint32_t block) {
    auto engine = emitterRight(12);
    engine->push(Command::add(2, BlockType::PowerChance, 5, 0));
    engine->push(Command::add(3, BlockType::PowerPrism, 10, 0));
    engine->push(Command::setParam(3, P::PowerPrism::streams, 3));
    engine->push(Command::setParam(3, P::PowerPrism::rotate, 300));
    engine->push(Command::add(4, BlockType::SourceTone, 10, -8));
    engine->push(Command::add(5, BlockType::SourceTone, 16, -6));
    engine->push(Command::add(6, BlockType::PowerLaser, 0, 6));
    engine->push(Command::setParam(6, P::PowerLaser::angle, 0));
    engine->push(Command::setParam(6, P::PowerLaser::selfPoweredMode, 1));
    engine->push(Command::add(7, BlockType::PowerCounter, 5, 6));
    const auto out = render(*engine, 48000 * 3, block);
    return std::pair{hashAudio(out), hashEvents(*engine)};
  };
  const auto a = run(128);
  CHECK(run(1024) == a);
  CHECK(run(37) == a);
}
