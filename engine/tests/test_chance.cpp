// CHG-0015: the Chance, a switch each hit sets at random (SPEC-SIMULATION-POWER-AND-PARTICLES R2d;
// SIMULATION-0005).
#include <algorithm>
#include <catch2/catch_test_macros.hpp>
#include <string>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// A self-powered emitter at (-6, 0) firing right at a Chance at the origin, with a Tone beside it
/// (within its reach).
std::unique_ptr<Engine> chanceRig(double chance, int rate = 8) {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerEmitter, -6, 0));
  e->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::setParam(1, P::PowerEmitter::rate, rate));
  e->push(Command::setParam(1, P::PowerEmitter::speed, 12));
  e->push(Command::add(2, BlockType::PowerChance, 0, 0));
  e->push(Command::setParam(2, P::PowerChance::chance, chance));
  e->push(Command::add(3, BlockType::SourceTone, 0, 4));
  return e;
}
int count(const Engine& e, Event::Type t, BlockId b) {
  return static_cast<int>(eventsOf(e, t, b).size());
}
/// Its rolls, as "x.." (x = fired).
std::string rolls(const Engine& e, BlockId c) {
  std::string s;
  for (const auto& ev : e.events())
    if (ev.block == c && (ev.type == Event::Type::Pass || ev.type == Event::Type::Block))
      s += ev.type == Event::Type::Pass ? 'x' : '.';
  return s;
}
}  // namespace

TEST_CASE(
    "R2d Chance: rolls once per hit: 0 never fires, 1 always, 0.5 about half, the same every run") {
  const auto run = [](double chance) {
    auto e = chanceRig(chance);
    render(*e, 48000 * 8);
    return rolls(*e, 2);
  };
  const auto none = run(0.0), all = run(1.0), half = run(0.5);
  REQUIRE(none.size() > 40);
  CHECK(none.find('x') == std::string::npos);
  CHECK(all.find('.') == std::string::npos);
  CHECK(half.size() == none.size());
  const auto fired = static_cast<double>(std::count(half.begin(), half.end(), 'x')) /
                     static_cast<double>(half.size());
  CHECK(fired > 0.3);
  CHECK(fired < 0.7);
  CHECK(run(0.5) == half);  // R12: its own seeded stream
}

TEST_CASE(
    "R2d Chance: a passed roll powers the blocks around it until a roll fails; the particle is "
    "used up") {
  const auto run = [](double chance) {
    auto e = chanceRig(chance, 30);
    e->push(Command::add(4, BlockType::SourceTone, 6, 0));  // behind it: never reached
    render(*e, 48000 * 6);
    CHECK(count(*e, Event::Type::Hit, 4) == 0);
    CHECK(count(*e, Event::Type::Logic, 2) >=
          count(*e, Event::Type::Emit, 1) - 1);  // the last may be in flight
    const auto r = rolls(*e, 2);
    int ons = 0;
    for (std::size_t i = 0; i < r.size(); ++i)
      ons += r[i] == 'x' && (i == 0 || r[i - 1] == '.');
    CHECK((e->block(3)->power() > 0) == (!r.empty() && r.back() == 'x'));  // holds the last roll
    return std::pair{count(*e, Event::Type::GateOn, 3), ons};
  };
  const auto [all, allOns] = run(1.0);
  CHECK(all == 1);  // always on: one long note
  CHECK(allOns == 1);
  const auto [half, halfOns] = run(0.5);
  CHECK(half == halfOns);  // a note each time a pass follows a fail
  CHECK(half > 1);
  CHECK(run(0.0).first == 0);
}

TEST_CASE(
    "R2d Chance: connects as Counter: to sources, emitters and lasers, never to other power "
    "blocks") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerChance, 0, 0));
  e->push(Command::add(2, BlockType::SourceTone, 0, 4));
  e->push(Command::add(3, BlockType::PowerEmitter, 4, 0));
  e->push(Command::add(4, BlockType::PowerLaser, -4, 0));
  e->push(Command::add(5, BlockType::PowerPower, 0, -4));
  e->push(Command::add(6, BlockType::PowerCounter, 3, -3));
  settle(*e);
  CHECK(e->connected(1, 2));
  CHECK(e->connected(1, 3));
  CHECK(e->connected(1, 4));
  CHECK_FALSE(e->connected(1, 5));
  CHECK_FALSE(e->connected(1, 6));
}

TEST_CASE("R2d Chance: a laser beam rolls once when it arrives (R8)") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerLaser, -6, 0));
  e->push(Command::setParam(1, P::PowerLaser::angle, 0));
  e->push(Command::setParam(1, P::PowerLaser::selfPoweredMode, 1));
  e->push(Command::add(2, BlockType::PowerChance, 0, 0));
  e->push(Command::setParam(2, P::PowerChance::chance, 1.0));
  e->push(Command::add(3, BlockType::SourceTone, 0, 4));
  render(*e, 48000 * 2);
  CHECK(rolls(*e, 2) == "x");
  CHECK(count(*e, Event::Type::GateOn, 3) == 1);
}
