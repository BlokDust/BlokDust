// A particle that hits another Particle Emitter is consumed and that emitter fires one particle at
// once (owner, 2026-11-11, CHG-0005; SPEC-SIMULATION-POWER-AND-PARTICLES R5b, SIMULATION-0004). v1
// let particles pass through.
#include <catch2/catch_test_macros.hpp>

#include "helpers.hpp"

using namespace bdtest;

namespace {
// Emitter 1 (self-powered) fires right at emitter 2 (unpowered), which fires down at a Tone.
void chain(Engine& engine) {
  engine.push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  engine.push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  engine.push(Command::setParam(1, P::PowerEmitter::angle, 0));
  engine.push(Command::add(2, BlockType::PowerEmitter, 10, 0));
  engine.push(Command::setParam(2, P::PowerEmitter::angle, 90));
  engine.push(Command::add(3, BlockType::SourceTone, 10, 10));
}
}  // namespace

TEST_CASE("R5b: a particle hitting an emitter is consumed and that emitter fires one particle") {
  auto engine = makeEngine();
  chain(*engine);
  render(*engine, 48000 * 4);
  const auto from1 = eventsOf(*engine, Event::Type::Emit, 1).size(),
             from2 = eventsOf(*engine, Event::Type::Emit, 2).size();
  const auto hits2 = eventsOf(*engine, Event::Type::Hit, 2).size();
  CHECK(from1 >= 2);
  CHECK(hits2 >= 1);
  CHECK(from2 == hits2);                                   // one particle per hit, no more
  CHECK(!eventsOf(*engine, Event::Type::Hit, 3).empty());  // emitter 2's particles reach the Tone
  CHECK(eventsOf(*engine, Event::Type::Hit, 1)
            .empty());  // an emitter never catches its own particles
}

TEST_CASE("R5b: no particle passes through an emitter") {
  auto engine = makeEngine();
  chain(*engine);
  engine->push(
      Command::add(4, BlockType::SourceTone, 20, 0));  // behind emitter 2, on emitter 1's line
  render(*engine, 48000 * 4);
  CHECK(eventsOf(*engine, Event::Type::Hit, 4).empty());
}

TEST_CASE("R5b: the same patch gives the same events (R12)") {
  auto a = makeEngine(), b = makeEngine();
  chain(*a);
  chain(*b);
  render(*a, 48000 * 3);
  render(*b, 48000 * 3);
  REQUIRE(a->events().size() == b->events().size());
  for (std::size_t i = 0; i < a->events().size(); ++i)
    CHECK(a->events()[i].sample == b->events()[i].sample);
}

TEST_CASE("R5b: overlapping emitters do not pass a particle back and forth") {
  auto engine = makeEngine();
  engine->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  engine->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  engine->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  engine->push(Command::add(2, BlockType::PowerEmitter, 0.5, 0));
  engine->push(Command::add(3, BlockType::SourceTone, 10, 0));
  render(*engine, 48000 * 3);
  CHECK(eventsOf(*engine, Event::Type::Hit, 2).empty());
  CHECK(eventsOf(*engine, Event::Type::Emit, 2).empty());
  CHECK(!eventsOf(*engine, Event::Type::Hit, 3).empty());
}
