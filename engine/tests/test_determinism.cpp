// SIMULATION-0001 / SPEC-SIMULATION R11–R12: identical output for identical input, regardless of
// buffer size.
#include <catch2/catch_test_macros.hpp>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// A busy scene: two emitters, tones, a toggle, a void, a filter, and edits scheduled mid-render.
void buildScene(Engine& e) {
  e.push(Command::add(1, BlockType::PowerEmitter, -12, 0));
  e.push(Command::setParam(1, P::PowerEmitter::angle, 0));
  e.push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  e.push(Command::setParam(1, P::PowerEmitter::rate, 23));
  e.push(Command::add(2, BlockType::PowerEmitter, 0, 12));
  e.push(Command::setParam(2, P::PowerEmitter::angle, -90));
  e.push(Command::setParam(2, P::PowerEmitter::selfPoweredMode, 1));
  e.push(Command::setParam(2, P::PowerEmitter::rate, 37));
  e.push(Command::setParam(2, P::PowerEmitter::speed, 7.3));
  e.push(Command::add(3, BlockType::SourceTone, 0, -0.5));
  e.push(Command::setParam(3, P::SourceTone::waveform, 3));
  e.push(Command::add(4, BlockType::FxFilter, 4, -2));
  e.push(Command::setParam(4, P::FxFilter::gain, 9));
  e.push(Command::add(5, BlockType::PowerToggle, 0, 6));
  e.push(Command::add(6, BlockType::SourceTone, 4, 9));
  e.push(Command::setParam(6, P::SourceTone::transpose, 7));
  e.push(Command::add(7, BlockType::PowerVoid, -6, 1));
  e.push(Command::add(8, BlockType::PowerEmitter, 0, -12));  // fires down into the filtered Tone 3
  e.push(Command::setParam(8, P::PowerEmitter::angle, 90));
  e.push(Command::setParam(8, P::PowerEmitter::selfPoweredMode, 1));
  e.push(Command::setParam(8, P::PowerEmitter::rate, 17));
  e.push(Command::move(7, -6, 0, 30001));  // not a tick boundary: applied at the next one
  e.push(Command::move(4, 30, 30, 120000));
  e.push(Command::setParam(3, P::SourceTone::fine, 0.37, 123457));
}
struct Run {
  std::uint64_t audio, events;
  std::size_t eventCount;
};
Run run(int sampleRate, std::uint32_t block, std::uint64_t seed = 1, std::int64_t seconds = 6) {
  auto e = makeEngine(sampleRate, seed);
  buildScene(*e);
  const auto out = render(*e, sampleRate * seconds, block);
  return {hashAudio(out), hashEvents(*e), e->events().size()};
}
}  // namespace

TEST_CASE("the busy scene actually exercises the simulation") {
  auto e = makeEngine();
  buildScene(*e);
  render(*e, 48000 * 6);
  CHECK(eventsOf(*e, Event::Type::Hit).size() >= 5);
  CHECK(eventsOf(*e, Event::Type::Logic).size() >= 2);
  CHECK(eventsOf(*e, Event::Type::GateOn).size() >= 5);
  // Tone 3 is retriggered repeatedly while chained through Filter 4 (before the filter moves away
  // at sample 120000)
  int filteredGates = 0;
  for (const auto& ev : eventsOf(*e, Event::Type::GateOn, 3))
    filteredGates += ev.sample < 120000;
  CHECK(filteredGates >= 3);
  CHECK(e->droppedEvents() == 0);
}

TEST_CASE("same input renders bit-identically across runs") {
  const auto a = run(48000, 128), b = run(48000, 128);
  CHECK(a.audio == b.audio);
  CHECK(a.events == b.events);
}

TEST_CASE("output is independent of audio buffer size (48 kHz and 44.1 kHz)") {
  for (int sr : {48000, 44100}) {
    INFO("sample rate " << sr);
    const auto ref = run(sr, 128);
    for (std::uint32_t block : {1u, 7u, 64u, 512u, 1000u, 4096u}) {
      INFO("block " << block);
      const auto r = run(sr, block);
      CHECK(r.audio == ref.audio);
      CHECK(r.events == ref.events);
    }
  }
}

TEST_CASE("the RNG seed only affects visuals (particle size), never the event stream or audio") {
  auto a = makeEngine(48000, 1), b = makeEngine(48000, 999);
  buildScene(*a);
  buildScene(*b);
  const auto oa = render(*a, 48000 * 3), ob = render(*b, 48000 * 3);
  CHECK(hashAudio(oa) == hashAudio(ob));
  CHECK(hashEvents(*a) == hashEvents(*b));
  REQUIRE(!a->particles().empty());
  REQUIRE(a->particles().size() == b->particles().size());
  bool anyDiff = false;
  for (std::size_t i = 0; i < a->particles().size(); ++i)
    anyDiff |= a->particles()[i].size != b->particles()[i].size;
  CHECK(anyDiff);
}
