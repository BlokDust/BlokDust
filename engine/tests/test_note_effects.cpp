// CHG-0017 (AUDIO-0002): Keys set pitch, and the note effects Chord, Arpeggiator and Random Note
// (SPEC-SIMULATION-POWER-AND-PARTICLES R10e–R10h).
#include <catch2/catch_test_macros.hpp>
#include <algorithm>
#include <cmath>
#include <utility>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
const BlockType KB = BlockType::InputComputerKeyboard;
double hz(int midi) { return 440.0 * std::pow(2.0, (midi - 69) / 12.0); }
/// Pitches (Hz) of the Tone's sounding voices, lowest first.
std::vector<double> pitches(const Engine& e, BlockId tone = 1) {
  std::vector<double> out;
  for (const auto& v : e.block(tone)->voices) if (v.active) out.push_back(v.pitch);
  std::sort(out.begin(), out.end());
  return out;
}
bool near(double a, double b) { return std::abs(a / b - 1.0) < 1e-6; }
bool are(const std::vector<double>& got, std::vector<double> want) {
  std::sort(want.begin(), want.end());
  if (got.size() != want.size()) return false;
  for (std::size_t i = 0; i < got.size(); ++i) if (!near(got[i], want[i])) return false;
  return true;
}
/// A Tone (1) with a Computer Keyboard (2) beside it; `fx` blocks join the Tone's chain as ids 10, 11, ….
std::unique_ptr<Engine> toneAndKeys(std::vector<BlockType> fx = {}, bool keysSetPitch = false) {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, KB, 0, -3));
  if (keysSetPitch) e->push(Command::setParam(2, P::InputComputerKeyboard::keysSetPitch, 1));
  BlockId id = 10;
  for (const auto t : fx) { e->push(Command::add(id, t, 3, static_cast<double>(id - 10) * 2)); ++id; }
  return e;
}
const double kBase = 261.6;  // v1 Config.BaseNote: a Tone's own note
}  // namespace

TEST_CASE("R10e Keys set pitch: off by default, a keyboard plays as before") {
  auto e = toneAndKeys();
  e->push(Command::noteOn(KB, 64));
  settle(*e);
  CHECK_FALSE(e->block(1)->arranged);
  CHECK(are(pitches(*e), {hz(64)}));
}

TEST_CASE("R10e Keys set pitch: held keys make no sound; power then plays them, all of them") {
  auto e = toneAndKeys({}, true);
  for (int k : {60, 64, 67}) e->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  settle(*e);
  CHECK(e->block(1)->arranged);
  CHECK(pitches(*e).empty());                       // keys alone: silent
  CHECK(count_if(e->events().begin(), e->events().end(), [](const Event& ev) { return ev.type == Event::Type::GateOn; }) == 0);
  e->push(Command::press(1, true));                 // power (a held pointer; a particle or laser is the same)
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(60), hz(64), hz(67)}));
  e->push(Command::noteOff(KB, 64));                // letting a key go takes its note away, without a new strike
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(60), hz(67)}));
  e->push(Command::press(1, false));
  render(*e, 480);
  CHECK(pitches(*e).empty());
  // With no keys held, power plays the Tone's own note.
  e->push(Command::noteOff(KB, 60)); e->push(Command::noteOff(KB, 67));
  e->push(Command::press(1, true));
  render(*e, 480);
  CHECK(are(pitches(*e), {kBase}));
}

TEST_CASE("R10e Keys set pitch: a particle strums the held chord") {
  auto e = toneAndKeys({}, true);
  e->push(Command::add(5, BlockType::PowerEmitter, -10, 0));
  e->push(Command::setParam(5, P::PowerEmitter::angle, 0));
  e->push(Command::setParam(5, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::setParam(5, P::PowerEmitter::rate, 60));
  e->push(Command::setParam(5, P::PowerEmitter::speed, 12));
  for (int k : {48, 55}) e->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  render(*e, 48000 * 2 + 9600);
  const auto on = eventsOf(*e, Event::Type::GateOn, 1), hits = eventsOf(*e, Event::Type::Hit, 1);
  REQUIRE(!hits.empty());
  CHECK(on.size() == hits.size() * 2);              // two notes per hit
}

TEST_CASE("R10f Chord: power on a Tone plays the chord on its own note; the type and inversion pick the notes") {
  auto e = toneAndKeys({BlockType::FxChord});
  e->push(Command::press(1, true));
  render(*e, 480);
  const auto st = [](int semis) { return kBase * std::pow(2.0, semis / 12.0); };
  CHECK(are(pitches(*e), {st(0), st(4), st(7)}));   // major, the default
  e->push(Command::setParam(10, P::FxChord::chord, 3));
  render(*e, 480);
  CHECK(are(pitches(*e), {st(0), st(3), st(7)}));   // minor: only the third changed
  e->push(Command::setParam(10, P::FxChord::chord, 6));
  e->push(Command::setParam(10, P::FxChord::inversion, 1));
  render(*e, 480);
  CHECK(are(pitches(*e), {st(4), st(7), st(10), st(12)}));  // seventh, first inversion
}

TEST_CASE("R10f Chord: every key of a keyboard becomes a chord, and lets go with its key") {
  auto e = toneAndKeys({BlockType::FxChord});
  e->push(Command::setParam(2, P::InputComputerKeyboard::isPolyphonic, 1));
  e->push(Command::setParam(10, P::FxChord::chord, 1));  // fifths
  e->push(Command::noteOn(KB, 60));
  e->push(Command::noteOn(KB, 62));
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(60), hz(67), hz(62), hz(69)}));
  e->push(Command::noteOff(KB, 60));
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(62), hz(69)}));
  // A mono keyboard sounds its newest key only.
  auto m = toneAndKeys({BlockType::FxChord});
  m->push(Command::setParam(10, P::FxChord::chord, 1));
  m->push(Command::noteOn(KB, 60));
  m->push(Command::noteOn(KB, 62));
  render(*m, 480);
  CHECK(are(pitches(*m), {hz(62), hz(69)}));
  m->push(Command::noteOff(KB, 62));
  render(*m, 480);
  CHECK(are(pitches(*m), {hz(60), hz(67)}));        // back to the key still held
}

TEST_CASE("R10f Chord: per-note bend reaches every note of that key's chord (PLUGIN-0004)") {
  auto e = makeEngine(48000, 1, false);
  const BlockType MIDI = BlockType::InputMidiController;
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, MIDI, 0, -3));
  e->push(Command::setParam(2, P::InputMidiController::isPolyphonic, 1));
  e->push(Command::add(10, BlockType::FxChord, 3, 0));
  e->push(Command::setParam(10, P::FxChord::chord, 1));
  e->push(Command::noteOn(MIDI, 60, 1.0, -1, 3));
  e->push(Command::noteExpression(MIDI, 60, 3, Command::Expression::Bend, 2.0));
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(62), hz(69)}));
}

TEST_CASE("R10g Arpeggiator, per hit: each strike plays the next of the held notes") {
  auto e = toneAndKeys({BlockType::FxArpeggiator}, true);
  e->push(Command::setParam(10, P::FxArpeggiator::perHit, 1));
  for (int k : {60, 64, 67}) e->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  std::vector<double> got;
  for (int i = 0; i < 5; ++i) {
    e->push(Command::press(1, true)); render(*e, 480);
    const auto p = pitches(*e);
    REQUIRE(p.size() == 1);
    got.push_back(p[0]);
    e->push(Command::press(1, false)); render(*e, 4800);
  }
  const double want[5] = {hz(60), hz(64), hz(67), hz(60), hz(64)};
  for (int i = 0; i < 5; ++i) CHECK(near(got[static_cast<std::size_t>(i)], want[i]));
}

TEST_CASE("R10g Arpeggiator, patterns and octaves") {
  const auto run = [](int pattern, int octaves) {
    auto e = toneAndKeys({BlockType::FxArpeggiator}, true);
    e->push(Command::setParam(10, P::FxArpeggiator::perHit, 1));
    e->push(Command::setParam(10, P::FxArpeggiator::pattern, pattern));
    e->push(Command::setParam(10, P::FxArpeggiator::octaves, octaves));
    for (int k : {60, 64, 67}) e->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
    std::vector<int> got;
    for (int i = 0; i < 8; ++i) {
      e->push(Command::press(1, true)); render(*e, 480);
      got.push_back(static_cast<int>(std::lround(69.0 + 12.0 * std::log2(pitches(*e).at(0) / 440.0))));
      e->push(Command::press(1, false)); render(*e, 4800);
    }
    return got;
  };
  CHECK(run(0, 1) == std::vector<int>{60, 64, 67, 60, 64, 67, 60, 64});
  CHECK(run(1, 1) == std::vector<int>{67, 64, 60, 67, 64, 60, 67, 64});
  CHECK(run(2, 1) == std::vector<int>{60, 64, 67, 64, 60, 64, 67, 64});
  CHECK(run(0, 2) == std::vector<int>{60, 64, 67, 72, 76, 79, 60, 64});
  const auto r = run(3, 1);
  CHECK(r == run(3, 1));                            // random, but the same every run
  for (int k : r) CHECK((k == 60 || k == 64 || k == 67));
}

TEST_CASE("R10g Arpeggiator, on its own: Speed (not synced) and Division (synced) set how fast it moves through held notes") {
  // Not synced, 8 notes a second: a new note every 30 ticks (6000 samples).
  auto e = toneAndKeys({BlockType::FxArpeggiator});
  e->push(Command::setParam(2, P::InputComputerKeyboard::isPolyphonic, 1));
  e->push(Command::setParam(10, P::FxArpeggiator::sync, 0));
  e->push(Command::setParam(10, P::FxArpeggiator::speed, 8));
  for (int k : {60, 64, 67}) e->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  render(*e, 48000);
  const auto on = eventsOf(*e, Event::Type::GateOn, 1);
  REQUIRE(on.size() == 8);
  for (std::size_t i = 1; i < on.size(); ++i) CHECK(on[i].sample - on[i - 1].sample == 6000);
  CHECK(are(pitches(*e), {hz(64)}));                // the 8th note: C E G C E G C E
  // Synced, 1/8 notes at 120 BPM: every 0.25 s.
  auto s = toneAndKeys({BlockType::FxArpeggiator});
  s->push(Command::setParam(2, P::InputComputerKeyboard::isPolyphonic, 1));
  s->push(Command::setParam(10, P::FxArpeggiator::division, 0.5));
  for (int k : {60, 64, 67}) s->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  render(*s, 48000);
  const auto son = eventsOf(*s, Event::Type::GateOn, 1);
  REQUIRE(son.size() == 4);
  for (std::size_t i = 1; i < son.size(); ++i) CHECK(son[i].sample - son[i - 1].sample == 12000);
  // Letting every key go stops it.
  for (int k : {60, 64, 67}) s->push(Command::noteOff(KB, static_cast<std::uint8_t>(k)));
  render(*s, 480);
  CHECK(pitches(*s).empty());
}

TEST_CASE("R10h Random Note: each hit gets a note of the key and scale, the same notes every run") {
  const auto run = [](std::uint64_t seed) {
    auto e = makeEngine(48000, seed, false);
    e->push(Command::add(1, BlockType::SourceTone, 0, 0));
    e->push(Command::add(10, BlockType::FxRandomNote, 3, 0));
    e->push(Command::setParam(10, P::FxRandomNote::key, 2));     // D
    e->push(Command::setParam(10, P::FxRandomNote::scale, 5));   // pentatonic
    e->push(Command::setParam(10, P::FxRandomNote::high, 1));    // two octaves
    std::vector<int> got;
    for (int i = 0; i < 40; ++i) {
      e->push(Command::press(1, true)); render(*e, 480);
      got.push_back(static_cast<int>(std::lround(69.0 + 12.0 * std::log2(pitches(*e).at(0) / 440.0))));
      e->push(Command::press(1, false)); render(*e, 2400);
    }
    return got;
  };
  const auto a = run(1);
  const int pent[5] = {0, 2, 4, 7, 9};
  int distinct = 0; std::array<bool, 128> seen{};
  for (int k : a) {
    CHECK(k >= 62);
    CHECK(k < 62 + 24);
    CHECK(std::find(std::begin(pent), std::end(pent), (k - 62) % 12) != std::end(pent));
    if (!seen[static_cast<std::size_t>(k)]) { seen[static_cast<std::size_t>(k)] = true; ++distinct; }
  }
  CHECK(distinct >= 5);
  CHECK(run(1) == a);
  CHECK(run(99) == a);   // the patch seed is visual-only (R12)
}

TEST_CASE("R10h Random Note with Keys set pitch picks among the held keys; then Chord, then Arpeggiator") {
  auto e = toneAndKeys({BlockType::FxRandomNote}, true);
  for (int k : {50, 57}) e->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  for (int i = 0; i < 12; ++i) {
    e->push(Command::press(1, true)); render(*e, 480);
    const auto p = pitches(*e);
    REQUIRE(p.size() == 1);
    CHECK((near(p[0], hz(50)) || near(p[0], hz(57))));
    e->push(Command::press(1, false)); render(*e, 2400);
  }
  // Random Note → Chord → Arpeggiator: one random root per strike, its fifth chord, played one note at a time.
  auto c = toneAndKeys({BlockType::FxArpeggiator, BlockType::FxChord, BlockType::FxRandomNote});
  c->push(Command::setParam(11, P::FxChord::chord, 1));
  c->push(Command::setParam(10, P::FxArpeggiator::sync, 0));
  c->push(Command::setParam(10, P::FxArpeggiator::speed, 20));
  c->push(Command::press(1, true));
  render(*c, 480);
  const double root = pitches(*c).at(0);
  render(*c, 2400);                                  // the Arpeggiator's next step: the fifth above the same root
  CHECK(near(pitches(*c).at(0), root * std::pow(2.0, 7.0 / 12.0)));
}

TEST_CASE("CHG-0017: joining or leaving a note effect starts clean, and plain sources are untouched (R12)") {
  auto e = toneAndKeys();
  e->push(Command::noteOn(KB, 60));
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(60)}));
  e->push(Command::add(10, BlockType::FxChord, 3, 0));   // the Tone becomes arranged: the held key is dropped
  render(*e, 480);
  CHECK(e->block(1)->arranged);
  CHECK(pitches(*e).empty());
  e->push(Command::noteOn(KB, 60));
  render(*e, 480);
  CHECK(pitches(*e).size() == 3);
  e->push(Command::remove(10));
  render(*e, 480);
  CHECK_FALSE(e->block(1)->arranged);
  CHECK(pitches(*e).empty());
  const auto run = [](std::uint32_t block) {
    auto x = toneAndKeys({BlockType::FxChord, BlockType::FxArpeggiator}, true);
    x->push(Command::add(5, BlockType::PowerEmitter, -10, 0));
    x->push(Command::setParam(5, P::PowerEmitter::angle, 0));
    x->push(Command::setParam(5, P::PowerEmitter::selfPoweredMode, 1));
    x->push(Command::setParam(5, P::PowerEmitter::rate, 20));
    x->push(Command::noteOn(KB, 57)); x->push(Command::noteOn(KB, 64));
    const auto out = render(*x, 48000 * 2, block);
    return std::pair{hashAudio(out), hashEvents(*x)};
  };
  const auto a = run(128);
  CHECK(run(1024) == a);
  CHECK(run(37) == a);
}

TEST_CASE("CHG-0019 Grid: its pads play like a keyboard's keys (poly by default); a slide bends the held note, no new attack") {
  auto e = makeEngine(48000, 1, false);
  const BlockType GRID = BlockType::InputGrid;
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, GRID, 0, -3));
  Command a = Command::noteOn(GRID, 52); a.id = 2;   // the page names the Grid block the pad is on
  Command b = Command::noteOn(GRID, 55); b.id = 2;
  e->push(a); e->push(b);
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(52), hz(55)}));          // two pads, two voices
  const auto strikes = eventsOf(*e, Event::Type::GateOn, 1).size();
  Command slide = Command::noteExpression(GRID, 52, 0, Command::Expression::Bend, 1.0); slide.id = 2;  // E → F
  e->push(slide);
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(53), hz(55)}));
  CHECK(eventsOf(*e, Event::Type::GateOn, 1).size() == strikes);  // legato: nothing struck again
  Command off = Command::noteOff(GRID, 52); off.id = 2;
  e->push(off);
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(55)}));
  // Octave moves every pad, as a keyboard's.
  e->push(Command::setParam(2, P::InputGrid::transpose, 1));
  render(*e, 480);
  CHECK(are(pitches(*e), {hz(67)}));
}
