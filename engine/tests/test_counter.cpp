// CHG-0015, SIMULATION-0005: the Counter, a switch with steps (SPEC-SIMULATION-POWER-AND-PARTICLES
// R2c, SPEC-CONNECTIONS-PROXIMITY R2, R4).
#include <catch2/catch_test_macros.hpp>
#include <string>

#include "helpers.hpp"

using namespace bdtest;

namespace {
constexpr std::int64_t kTick = 200;  // samples per engine tick at 48 kHz

/// A self-powered emitter at (-2, 0) firing right every 20 v1 frames (1/3 s) at a Counter (2) at
/// (6, 0), with a Tone (3) beside the Counter, out of the particles' way.
std::unique_ptr<Engine> counterRig(int steps = 8, int hits = 3, int rotate = 0,
                                   double pattern = -1) {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerEmitter, -2, 0));  // out of the Counter's reach
  e->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::setParam(1, P::PowerEmitter::rate, 20));
  e->push(Command::setParam(1, P::PowerEmitter::speed, 12));
  e->push(Command::add(2, BlockType::PowerCounter, 6, 0));
  e->push(Command::setParam(2, P::PowerCounter::steps, steps));
  e->push(Command::setParam(2, P::PowerCounter::hits, hits));
  e->push(Command::setParam(2, P::PowerCounter::rotate, rotate));
  e->push(Command::setParam(2, P::PowerCounter::pattern, pattern));
  e->push(Command::add(3, BlockType::SourceTone, 6, 4));
  return e;
}

/// Renders tick by tick and records each hit on Counter `c` as 'x' (Tone `t` is powered after it)
/// or '.' (it is not).
std::string play(Engine& e, std::size_t hits, BlockId c = 2, BlockId t = 3) {
  std::string s;
  settle(e);
  std::size_t seen = eventsOf(e, Event::Type::Logic, c).size();
  for (int i = 0; i < 240 * 30 && s.size() < hits; ++i) {
    render(e, kTick, static_cast<std::uint32_t>(kTick));
    const auto n = eventsOf(e, Event::Type::Logic, c).size();
    for (; seen < n; ++seen)
      s += e.block(t)->power() > 0 ? 'x' : '.';
  }
  return s;
}
}  // namespace

TEST_CASE(
    "R2c Counter: each hit takes a step; it powers the connected Tone while on an active step "
    "(E(3,8) = x..x..x.)") {
  auto e = counterRig();
  e->push(
      Command::add(4, BlockType::SourceTone, 12, 0));  // behind the Counter, in the particles' path
  CHECK(play(*e, 16) == "x..x..x.x..x..x.");
  CHECK(e->connected(2, 3));
  CHECK(eventsOf(*e, Event::Type::Hit, 4)
            .empty());  // the Counter uses up every particle, as Pulse does
}

TEST_CASE("R2c Counter: an active step holds its power until a hit moves it to an empty step") {
  auto e = counterRig(2, 2);  // every step active: on from the first hit, and stays on
  CHECK(play(*e, 8) == "xxxxxxxx");
  CHECK(eventsOf(*e, Event::Type::GateOn, 3).size() == 1);  // one long note: a switch, not a pulse
  auto f = counterRig(4, 2);                                // x.x.: on for a step, off for a step
  CHECK(play(*f, 8) == "x.x.x.x.");
  CHECK(eventsOf(*f, Event::Type::GateOn, 3).size() == 4);
  render(*f, 48000);  // between hits, the step's power holds
  CHECK((f->block(3)->power() > 0) == (eventsOf(*f, Event::Type::Logic, 2).size() % 2 == 1));
}

TEST_CASE("R2c Counter: steps, hits and rotate shape the pattern") {
  const auto run = [](int steps, int hits, int rotate) {
    auto e = counterRig(steps, hits, rotate);
    return play(*e, static_cast<std::size_t>(steps));
  };
  CHECK(run(8, 3, 0) == "x..x..x.");
  CHECK(run(8, 3, 3) == "x..x.x..");  // the same pattern, read from its 4th step
  CHECK(run(8, 5, 0) ==
        "x.x.xx.x");  // five as evenly as eight allows (a rotation of the cinquillo)
  CHECK(run(4, 4, 0) == "xxxx");
  CHECK(run(4, 0, 0) == "....");
  CHECK(run(4, 1, 0) == "x...");  // a divider: every 4th hit
}

TEST_CASE(
    "R2c Counter: steps set by hand (pattern >= 0) play as set; -1 goes back to the Euclidean "
    "pattern") {
  const auto run = [](double mask) {
    auto e = counterRig(6, 2, 1, mask);
    return play(*e, 6);
  };
  CHECK(run(0b100110) == ".xx..x");  // bit k = step k, rotate ignored
  CHECK(run(0) == "......");
  CHECK(run(-1) == "..x..x");  // E(2,6) read from its 2nd step
}

TEST_CASE("R2c Counter: a beam takes one step when it arrives, however long it stays") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerLaser, -4,
                       0));  // out of the Counter's reach, or the Counter would hold it on
  e->push(Command::setParam(1, P::PowerLaser::angle, 0));
  e->push(Command::add(2, BlockType::PowerCounter, 6, 0));
  e->push(Command::setParam(2, P::PowerCounter::steps, 2));
  e->push(Command::setParam(2, P::PowerCounter::hits, 1));  // x . x . …
  e->push(Command::add(3, BlockType::SourceTone, 6, 4));
  const auto beamFor = [&](std::int64_t on, std::int64_t off) {
    e->push(Command::add(static_cast<BlockId>(100 + on), BlockType::PowerPower, -4, 3, on));
    e->push(Command::remove(static_cast<BlockId>(100 + on), off));
  };
  beamFor(4800, 33600);
  beamFor(43200, 52800);
  render(*e, 9600);
  CHECK(eventsOf(*e, Event::Type::Logic, 2).size() == 1);
  CHECK(e->block(3)->power() > 0);  // first arrival: an active step
  render(*e, 24000);                // the beam stays for half a second more: no more steps
  CHECK(eventsOf(*e, Event::Type::Logic, 2).size() == 1);
  CHECK(e->block(3)->power() > 0);  // still on that step: still on
  render(*e, 14400);
  CHECK(eventsOf(*e, Event::Type::Logic, 2).size() == 2);
  CHECK(e->block(3)->power() == 0);  // second arrival: an empty step
}

TEST_CASE("R2c Counter: a Counter with Hits 1 carries into another through a short Laser") {
  // Emitter → Counter A (2 steps, 1 hit) powers Laser 5 → its beam reaches Counter B (2 steps, 1
  // hit) beside Tone 3.
  auto e = counterRig(2, 1);
  e->push(Command::move(3, 6, 30));
  e->push(Command::add(5, BlockType::PowerLaser, 7, 5));
  e->push(Command::setParam(5, P::PowerLaser::angle, 90));  // straight down the stage
  e->push(Command::setParam(5, P::PowerLaser::range, 300));
  e->push(Command::add(6, BlockType::PowerCounter, 6, 24));
  e->push(Command::setParam(6, P::PowerCounter::steps, 2));
  e->push(Command::setParam(6, P::PowerCounter::hits, 1));
  CHECK(play(*e, 4, 2, 5) == "x.x.");  // A turns the Laser on for every other hit
  CHECK(eventsOf(*e, Event::Type::Logic, 6).size() == 2);  // each time on is one arrival at B
  CHECK(e->connected(6, 3));
  CHECK(eventsOf(*e, Event::Type::GateOn, 3).size() ==
        1);  // B passes one in two on: every 4th hit sounds
}

TEST_CASE("R2c Counter connects as a power effect (SPEC-CONNECTIONS-PROXIMITY R2, R4)") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerCounter, 0, 0));
  e->push(Command::add(2, BlockType::SourceTone, 3, 0));
  e->push(Command::add(3, BlockType::PowerEmitter, -3, 0));
  e->push(Command::add(4, BlockType::PowerLaser, 0, 3));
  e->push(Command::add(5, BlockType::PowerPower, 0, -3));
  e->push(Command::add(6, BlockType::FxFilter, 4, 2));
  settle(*e);
  CHECK(e->connected(1, 2));
  CHECK(e->connected(1, 3));
  CHECK(e->connected(1, 4));
  CHECK_FALSE(e->connected(1, 5));  // power blocks never connect to each other
  CHECK_FALSE(e->connected(1, 6));  // nor to audio effects
}

TEST_CASE("R2c Counter: the world power switch and the panel's Reset send it back to step 1, off") {
  auto e = counterRig();
  CHECK(play(*e, 2) == "x.");
  e->push(Command::worldPower(false));
  e->push(Command::worldPower(true));
  render(*e, kTick);
  CHECK(e->block(2)->counterStep == 0);
  CHECK(play(*e, 2) == "x.");
  CHECK(play(*e, 1) == ".");
  CHECK(play(*e, 1) == "x");  // on (step 4)
  e->push(Command::reset(2));
  render(*e, kTick);
  CHECK(e->block(2)->counterStep == 0);
  CHECK(e->block(3)->power() == 0);  // off until the next hit
  CHECK(play(*e, 4) == "x..x");
}

TEST_CASE("R2c Counter: a Counter inside a Stage starts over when the Stage gains power (R13)") {
  auto outer = makeEngine(48000, 1, false);
  outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
  outer->prime();
  EngineConfig cfg;
  cfg.sampleRate = 48000;
  cfg.child = true;
  cfg.parent = outer.get();
  auto inner = std::make_unique<Engine>(cfg);
  inner->push(Command::add(1, BlockType::PowerEmitter, -2, 0));
  inner->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  inner->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  inner->push(Command::setParam(1, P::PowerEmitter::rate, 20));
  inner->push(Command::setParam(1, P::PowerEmitter::speed, 12));
  inner->push(Command::add(2, BlockType::PowerCounter, 6, 0));
  REQUIRE(outer->attachStage(1, inner.get()));
  outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
  render(*outer, 48000);
  CHECK(inner->block(2)->counterStep != 0);
  outer->push(Command::remove(2));
  render(*outer, 4800);
  outer->push(Command::add(3, BlockType::PowerPower, 3, 0));
  render(*outer, 400);
  CHECK(inner->block(2)->counterStep == 0);
}
