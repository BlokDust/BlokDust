// CHG-0015: Counter, Chance and Prism (SPEC-SIMULATION-POWER-AND-PARTICLES R5c, R5d, R7a; SIMULATION-0005/0006).
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <string>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// A self-powered emitter at the origin firing right every 20 v1 frames (1/3 s), fast particles.
std::unique_ptr<Engine> emitterRight(int rate = 20) {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  e->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::setParam(1, P::PowerEmitter::rate, rate));
  e->push(Command::setParam(1, P::PowerEmitter::speed, 12));
  return e;
}
int count(const Engine& e, Event::Type t, BlockId b = kInvalidBlock) { return static_cast<int>(eventsOf(e, t, b).size()); }
/// The pass/block pattern a gate produced, as "x.." (x = passed).
std::string pattern(const Engine& e, BlockId gate) {
  std::string s;
  for (const auto& ev : e.events()) if (ev.block == gate && (ev.type == Event::Type::Pass || ev.type == Event::Type::Block)) s += ev.type == Event::Type::Pass ? 'x' : '.';
  return s;
}
}  // namespace

TEST_CASE("R5c Counter: E(3,8) lets through hits 1, 4 and 7 of every 8 (x..x..x.)") {
  auto e = emitterRight();
  e->push(Command::add(2, BlockType::PowerCounter, 6, 0));
  e->push(Command::add(3, BlockType::SourceTone, 12, 0));
  render(*e, 48000 * 6);  // 17 particles
  const auto p = pattern(*e, 2);
  REQUIRE(p.size() >= 16);
  CHECK(p.substr(0, 16) == "x..x..x.x..x..x.");
  // What passed carried on to the Tone; what did not was absorbed.
  CHECK(count(*e, Event::Type::Hit, 3) >= 5);
  CHECK(count(*e, Event::Type::Hit, 3) <= count(*e, Event::Type::Pass, 2));
}

TEST_CASE("R5c Counter: steps, hits and rotate shape the pattern") {
  const auto run = [](int steps, int hits, int rotate) {
    auto e = emitterRight();
    e->push(Command::add(2, BlockType::PowerCounter, 6, 0));
    e->push(Command::setParam(2, P::PowerCounter::steps, steps));
    e->push(Command::setParam(2, P::PowerCounter::hits, hits));
    e->push(Command::setParam(2, P::PowerCounter::rotate, rotate));
    render(*e, 48000 * 4);
    return pattern(*e, 2).substr(0, static_cast<std::size_t>(steps));
  };
  CHECK(run(8, 3, 0) == "x..x..x.");
  CHECK(run(8, 3, 3) == "x..x.x..");   // the same pattern, read from its 4th step
  CHECK(run(8, 5, 0) == "x.x.xx.x");   // five as evenly as eight allows (a rotation of the cinquillo)
  CHECK(run(4, 4, 0) == "xxxx");
  CHECK(run(4, 0, 0) == "....");
  CHECK(run(8, 1, 0) == "x.......");   // every 8th hit
}

TEST_CASE("R5c Chance: 0 stops everything, 1 passes everything, 0.5 about half, the same every run") {
  const auto run = [](double chance) {
    auto e = emitterRight(8);
    e->push(Command::add(2, BlockType::PowerChance, 6, 0));
    e->push(Command::setParam(2, P::PowerChance::chance, chance));
    render(*e, 48000 * 8);
    return pattern(*e, 2);
  };
  const auto none = run(0.0), all = run(1.0), half = run(0.5);
  CHECK(none.find('x') == std::string::npos);
  CHECK(all.find('.') == std::string::npos);
  REQUIRE(half.size() > 40);
  const auto passed = static_cast<double>(std::count(half.begin(), half.end(), 'x')) / static_cast<double>(half.size());
  CHECK(passed > 0.3);
  CHECK(passed < 0.7);
  CHECK(run(0.5) == half);  // R12: its own seeded stream
}

TEST_CASE("R5c: a gate decides once per particle, on entry, and a passed particle keeps its course") {
  auto e = emitterRight(60);
  e->push(Command::add(2, BlockType::PowerChance, 6, 0));
  e->push(Command::setParam(2, P::PowerChance::chance, 1.0));
  e->push(Command::add(3, BlockType::SourceTone, 12, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 0, 48000 * 3));
  render(*e, 48000 * 5);
  REQUIRE(count(*e, Event::Type::Emit, 1) >= 2);
  CHECK(count(*e, Event::Type::Pass, 2) == count(*e, Event::Type::Emit, 1));
  CHECK(count(*e, Event::Type::Hit, 3) == count(*e, Event::Type::Emit, 1));
}

TEST_CASE("R5d Prism: a particle leaves as its streams, fanned across the spread around the angle") {
  auto e = emitterRight(600);  // one particle in this test
  e->push(Command::setParam(1, P::PowerEmitter::rate, 30));
  e->push(Command::add(2, BlockType::PowerPrism, 6, 0));
  e->push(Command::setParam(2, P::PowerPrism::angle, -90));  // up
  e->push(Command::setParam(2, P::PowerPrism::streams, 3));
  e->push(Command::setParam(2, P::PowerPrism::spread, 90));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 0, 30000));  // stop after the first
  // Run until the split, then look at the three particles.
  for (int i = 0; i < 400 && count(*e, Event::Type::Split, 2) == 0; ++i) render(*e, 200);
  REQUIRE(count(*e, Event::Type::Split, 2) == 1);
  REQUIRE(e->particles().size() == 3);
  render(*e, 200 * 20);  // 20 ticks on
  const auto ps = e->particles();
  REQUIRE(ps.size() == 3);
  const double want[3] = {-135.0, -90.0, -45.0};
  for (int k = 0; k < 3; ++k) {
    const double a = std::atan2(ps[static_cast<std::size_t>(k)].y - 0.0, ps[static_cast<std::size_t>(k)].x - 6.0) * 180.0 / 3.141592653589793;
    CHECK(std::abs(a - want[k]) < 0.01);
    // same speed as the particle that came in: 12 units/frame = 0.2 grid/tick
    CHECK(std::abs(std::hypot(ps[static_cast<std::size_t>(k)].vx, ps[static_cast<std::size_t>(k)].vy) - 0.2) < 1e-9);
  }
}

TEST_CASE("R5d Prism: streams keep the range the particle had left, so two facing Prisms do not loop forever") {
  auto e = emitterRight(600);
  e->push(Command::setParam(1, P::PowerEmitter::rate, 30));
  e->push(Command::setParam(1, P::PowerEmitter::range, 600));  // 50 frames at speed 12 = 200 ticks = 40 grid
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 0, 30000));
  e->push(Command::add(2, BlockType::PowerPrism, 6, 0));
  e->push(Command::setParam(2, P::PowerPrism::angle, 0));     // on to the right
  e->push(Command::add(3, BlockType::PowerPrism, 16, 0));
  e->push(Command::setParam(3, P::PowerPrism::angle, 180));   // back to the left
  render(*e, 48000 * 3);
  CHECK(e->particles().empty());
  const int splits = count(*e, Event::Type::Split);
  CHECK(splits >= 2);   // it bounced
  CHECK(splits <= 5);   // 40 grid of range, 10 grid a leg
}

TEST_CASE("R7a: a Prism carries a laser's beam on, split, with the length it had left") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerLaser, 0, 0));
  e->push(Command::setParam(1, P::PowerLaser::angle, 0));
  e->push(Command::setParam(1, P::PowerLaser::selfPoweredMode, 1));
  e->push(Command::setParam(1, P::PowerLaser::range, 300));  // 20 grid
  e->push(Command::add(2, BlockType::PowerPrism, 8, 0));
  e->push(Command::setParam(2, P::PowerPrism::angle, -90));
  e->push(Command::setParam(2, P::PowerPrism::streams, 2));
  e->push(Command::setParam(2, P::PowerPrism::spread, 180));  // left and right of up: along ±x
  e->push(Command::add(3, BlockType::SourceTone, 8, -6));     // straight up: not on either stream
  e->push(Command::add(4, BlockType::SourceTone, 14, 0));     // on the right-hand stream
  e->push(Command::add(5, BlockType::SourceTone, 30, 0));     // beyond what is left of the beam
  render(*e, 4800);
  CHECK(e->beams().size() == 3);
  CHECK(e->block(4)->laserPower == 1);
  CHECK(e->block(3)->laserPower == 0);
  CHECK(e->block(5)->laserPower == 0);
  // The stream to the right ends 20 − 7 = 13 grid from the prism (the beam met its edge at x = 7).
  double far = 0;
  for (const auto& b : e->beams()) far = std::max(far, b.x1);
  CHECK(std::abs(far - 21.0) < 1e-6);
}

TEST_CASE("R7a: a Counter decides when a beam arrives and holds that while the beam stays") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerLaser, 0, 0));
  e->push(Command::setParam(1, P::PowerLaser::angle, 0));
  e->push(Command::add(2, BlockType::PowerCounter, 6, 0));
  e->push(Command::setParam(2, P::PowerCounter::steps, 2));
  e->push(Command::setParam(2, P::PowerCounter::hits, 1));    // pass, block, pass, …
  e->push(Command::add(3, BlockType::SourceTone, 12, 0));
  const auto beamFor = [&](std::int64_t on, std::int64_t off) {
    e->push(Command::add(static_cast<BlockId>(100 + on), BlockType::PowerPower, 0, 3, on));
    e->push(Command::remove(static_cast<BlockId>(100 + on), off));
  };
  beamFor(4800, 14400); beamFor(24000, 33600); beamFor(43200, 52800);
  render(*e, 9600);
  CHECK(e->block(3)->laserPower == 1);   // first arrival: through
  CHECK(count(*e, Event::Type::Pass, 2) == 1);
  render(*e, 19200);                     // second beam is on
  CHECK(e->block(3)->laserPower == 0);   // blocked for as long as it stays
  CHECK(count(*e, Event::Type::Block, 2) == 1);
  render(*e, 19200);
  CHECK(e->block(3)->laserPower == 1);   // third: through again
  CHECK(pattern(*e, 2) == "x.x");
}

TEST_CASE("R7a: beams never pass the same Prism twice, and one laser casts a bounded number of beams") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerLaser, 0, 0));
  e->push(Command::setParam(1, P::PowerLaser::angle, 0));
  e->push(Command::setParam(1, P::PowerLaser::selfPoweredMode, 1));
  e->push(Command::setParam(1, P::PowerLaser::range, 1200));
  // Two Prisms pointing at each other, each splitting four ways.
  e->push(Command::add(2, BlockType::PowerPrism, 6, 0));
  e->push(Command::setParam(2, P::PowerPrism::angle, 0));
  e->push(Command::setParam(2, P::PowerPrism::streams, 4));
  e->push(Command::setParam(2, P::PowerPrism::spread, 10));
  e->push(Command::add(3, BlockType::PowerPrism, 16, 0));
  e->push(Command::setParam(3, P::PowerPrism::angle, 180));
  e->push(Command::setParam(3, P::PowerPrism::streams, 4));
  e->push(Command::setParam(3, P::PowerPrism::spread, 10));
  render(*e, 4800);
  CHECK(e->beams().size() <= static_cast<std::size_t>(kMaxBeamSegments));
  CHECK(e->beams().size() >= 5);
}

TEST_CASE("CHG-0015: gates connect to nothing, and the world power switch restarts a Counter") {
  auto e = emitterRight();
  e->push(Command::add(2, BlockType::PowerCounter, 6, 0));
  e->push(Command::add(3, BlockType::SourceTone, 9, 4));
  e->push(Command::add(4, BlockType::PowerPower, 6, -4));
  render(*e, 48000);
  CHECK_FALSE(e->connected(2, 3));
  CHECK_FALSE(e->connected(2, 4));
  CHECK(e->block(2)->gateStep != 0);
  e->push(Command::worldPower(false));
  e->push(Command::worldPower(true));
  settle(*e);
  CHECK(e->block(2)->gateStep == 0);
}

TEST_CASE("R12 (CHG-0015): gates and prisms render bit-identically whatever the buffer size") {
  const auto run = [](std::uint32_t block) {
    auto e = emitterRight(12);
    e->push(Command::add(2, BlockType::PowerChance, 5, 0));
    e->push(Command::add(3, BlockType::PowerPrism, 10, 0));
    e->push(Command::setParam(3, P::PowerPrism::streams, 3));
    e->push(Command::setParam(3, P::PowerPrism::rotate, 300));
    e->push(Command::add(4, BlockType::SourceTone, 10, -8));
    e->push(Command::add(5, BlockType::SourceTone, 16, -6));
    e->push(Command::add(6, BlockType::PowerLaser, 0, 6));
    e->push(Command::setParam(6, P::PowerLaser::angle, 0));
    e->push(Command::setParam(6, P::PowerLaser::selfPoweredMode, 1));
    e->push(Command::add(7, BlockType::PowerCounter, 5, 6));
    const auto out = render(*e, 48000 * 3, block);
    return std::pair{hashAudio(out), hashEvents(*e)};
  };
  const auto a = run(128);
  CHECK(run(1024) == a);
  CHECK(run(37) == a);
}
