// CHG-0017 (AUDIO-0002): Silent Keys, and the note effects Chord, Arpeggiator and Random Note
// (SPEC-SIMULATION-POWER-AND-PARTICLES R10e–R10h).
#include <algorithm>
#include <array>
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <utility>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
const BlockType KB = BlockType::InputComputerKeyboard;
double hz(int midi) {
  return 440.0 * std::pow(2.0, (midi - 69) / 12.0);
}
/// Pitches (Hz) of the Tone's sounding voices, lowest first.
std::vector<double> pitches(const Engine& engine, BlockId tone = 1) {
  std::vector<double> out;
  for (const auto& v : engine.block(tone)->voices)
    if (v.active)
      out.push_back(v.pitch);
  std::sort(out.begin(), out.end());
  return out;
}
bool near(double a, double b) {
  return std::abs(a / b - 1.0) < 1e-6;
}
bool are(const std::vector<double>& got, std::vector<double> want) {
  std::sort(want.begin(), want.end());
  if (got.size() != want.size())
    return false;
  for (std::size_t i = 0; i < got.size(); ++i)
    if (!near(got[i], want[i]))
      return false;
  return true;
}
/// A Tone (1) with a Computer Keyboard (2) beside it; `fx` blocks join the Tone's chain as ids 10,
/// 11, ….
std::unique_ptr<Engine> toneAndKeys(std::vector<BlockType> fx = {}, bool keysSetPitch = false) {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::SourceTone, 0, 0));
  engine->push(Command::add(2, KB, 0, -3));
  if (keysSetPitch)
    engine->push(Command::setParam(2, P::InputComputerKeyboard::keysSetPitch, 1));
  BlockId id = 10;
  for (const auto t : fx) {
    engine->push(Command::add(id, t, 3, static_cast<double>(id - 10) * 2));
    ++id;
  }
  return engine;
}
const double kBase = 261.6;  // v1 Config.BaseNote: a Tone's own note
}  // namespace

TEST_CASE("R10e Silent Keys: off by default, a keyboard plays as before") {
  auto engine = toneAndKeys();
  engine->push(Command::noteOn(KB, 64));
  settle(*engine);
  CHECK_FALSE(engine->block(1)->arranged);
  CHECK(are(pitches(*engine), {hz(64)}));
}

TEST_CASE("R10e Silent Keys: held keys make no sound; power then plays them, all of them") {
  auto engine = toneAndKeys({}, true);
  for (int k : {60, 64, 67})
    engine->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  settle(*engine);
  CHECK(engine->block(1)->arranged);
  CHECK(pitches(*engine).empty());  // keys alone: silent
  CHECK(count_if(engine->events().begin(), engine->events().end(),
                 [](const Event& ev) { return ev.type == Event::Type::GateOn; }) == 0);
  engine->push(Command::press(1, true));  // power (a held pointer; a particle or laser is the same)
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(60), hz(64), hz(67)}));
  engine->push(
      Command::noteOff(KB, 64));  // letting a key go takes its note away, without a new strike
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(60), hz(67)}));
  engine->push(Command::press(1, false));
  render(*engine, 480);
  CHECK(pitches(*engine).empty());
  // With no keys held, power plays the Tone's own note.
  engine->push(Command::noteOff(KB, 60));
  engine->push(Command::noteOff(KB, 67));
  engine->push(Command::press(1, true));
  render(*engine, 480);
  CHECK(are(pitches(*engine), {kBase}));
}

TEST_CASE("R10e Silent Keys: a particle strums the held chord") {
  auto engine = toneAndKeys({}, true);
  engine->push(Command::add(5, BlockType::PowerEmitter, -10, 0));
  engine->push(Command::setParam(5, P::PowerEmitter::angle, 0));
  engine->push(Command::setParam(5, P::PowerEmitter::selfPoweredMode, 1));
  engine->push(Command::setParam(5, P::PowerEmitter::rate, 60));
  engine->push(Command::setParam(5, P::PowerEmitter::speed, 12));
  for (int k : {48, 55})
    engine->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  render(*engine, 48000 * 2 + 9600);
  const auto on = eventsOf(*engine, Event::Type::GateOn, 1),
             hits = eventsOf(*engine, Event::Type::Hit, 1);
  REQUIRE(!hits.empty());
  CHECK(on.size() == hits.size() * 2);  // two notes per hit
}

TEST_CASE(
    "R10f Chord: power on a Tone plays the chord on its own note's bar, as the Tone's Note sets "
    "it") {
  auto engine = toneAndKeys({BlockType::FxChord});
  engine->push(Command::setParam(10, P::FxChord::smooth, 0));
  engine->push(Command::press(1, true));
  render(*engine, 480);
  const auto st = [](int semis) {
    return kBase * std::pow(2.0, semis / 12.0);
  };
  CHECK(are(pitches(*engine), {st(0), st(4), st(7)}));  // C: major (default)
  engine->push(Command::setParam(10, P::FxChord::q0, 2));
  render(*engine, 480);
  CHECK(
      are(pitches(*engine), {st(0), st(3), st(7)}));  // C's bar set to minor: only the third moved
  engine->push(Command::press(1, false));
  render(*engine, 4800);
  engine->push(Command::setParam(1, P::SourceTone::transpose, 2));
  engine->push(Command::press(1, true));
  render(*engine, 480);
  CHECK(are(pitches(*engine),
            {st(2), st(5), st(9), st(12)}));  // the Tone plays D: D's bar, minor 7th
  engine->push(Command::setParam(10, P::FxChord::q2,
                                 0));  // a setting changing re-plays the chord (CHG-0017)
  render(*engine, 480);
  CHECK(are(pitches(*engine), {st(2)}));  // None: the note alone
}

TEST_CASE(
    "R10f Chord: each key plays the chord on its own bar; Key slides the bars; each lets go with "
    "its key") {
  auto engine = toneAndKeys({BlockType::FxChord});
  engine->push(Command::setParam(2, P::InputComputerKeyboard::isPolyphonic, 1));
  engine->push(Command::setParam(10, P::FxChord::smooth, 0));
  engine->push(Command::noteOn(KB, 60));
  engine->push(Command::noteOn(KB, 62));
  render(*engine, 480);
  CHECK(are(pitches(*engine),
            {hz(60), hz(64), hz(67), hz(62), hz(65), hz(69), hz(72)}));  // C major, D minor 7th
  engine->push(Command::noteOff(KB, 60));
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(62), hz(65), hz(69), hz(72)}));
  engine->push(Command::noteOff(KB, 62));
  engine->push(
      Command::setParam(10, P::FxChord::key, 2));  // Key D: E plays D's stored chord (minor 7th)
  engine->push(Command::noteOn(KB, 64));
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(64), hz(67), hz(71), hz(74)}));
  // A mono keyboard sounds its newest key only.
  auto m = toneAndKeys({BlockType::FxChord});
  m->push(Command::setParam(10, P::FxChord::smooth, 0));
  m->push(Command::noteOn(KB, 60));
  m->push(Command::noteOn(KB, 64));
  render(*m, 480);
  CHECK(are(pitches(*m), {hz(64), hz(67), hz(71)}));  // E minor
  m->push(Command::noteOff(KB, 64));
  render(*m, 480);
  CHECK(are(pitches(*m), {hz(60), hz(64), hz(67)}));  // back to the key still held
}

TEST_CASE(
    "R10f Chord, Smooth: the first chord in root position, then each note to the octave nearest "
    "the last chord") {
  auto engine = toneAndKeys({BlockType::FxChord});  // Smooth is on by default
  engine->push(Command::noteOn(KB, 60));
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(60), hz(64), hz(67)}));  // C major, root position
  engine->push(Command::noteOn(KB, 65));  // F major 7th: F stays; A, C and E nearest C-E-G
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(60), hz(64), hz(65), hz(69)}));
  engine->push(Command::setParam(10, P::FxChord::q0,
                                 2));  // another bar changing doesn't move the sounding chord
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(60), hz(64), hz(65), hz(69)}));
  engine->push(Command::noteOff(KB, 65));
  engine->push(Command::noteOff(KB, 60));
  engine->push(Command::setParam(10, P::FxChord::smooth, 0));
  engine->push(Command::noteOn(KB, 65));
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(65), hz(69), hz(72), hz(76)}));  // Smooth off: root position
}

TEST_CASE("R10f Chord: per-note bend reaches every note of that key's chord (PLUGIN-0004)") {
  auto engine = makeEngine(48000, 1, false);
  const BlockType MIDI = BlockType::InputMidiController;
  engine->push(Command::add(1, BlockType::SourceTone, 0, 0));
  engine->push(Command::add(2, MIDI, 0, -3));
  engine->push(Command::setParam(2, P::InputMidiController::isPolyphonic, 1));
  engine->push(Command::add(10, BlockType::FxChord, 3, 0));
  engine->push(Command::noteOn(MIDI, 60, 1.0, -1, 3));
  engine->push(Command::noteExpression(MIDI, 60, 3, Command::Expression::Bend, 2.0));
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(62), hz(66), hz(69)}));  // C major, bent up a tone
}

TEST_CASE("R10g Arpeggiator, per hit: each strike plays the next of the held notes") {
  auto engine = toneAndKeys({BlockType::FxArpeggiator}, true);
  engine->push(Command::setParam(10, P::FxArpeggiator::perHit, 1));
  for (int k : {60, 64, 67})
    engine->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  std::vector<double> got;
  for (int i = 0; i < 5; ++i) {
    engine->push(Command::press(1, true));
    render(*engine, 480);
    const auto p = pitches(*engine);
    REQUIRE(p.size() == 1);
    got.push_back(p[0]);
    engine->push(Command::press(1, false));
    render(*engine, 4800);
  }
  const double want[5] = {hz(60), hz(64), hz(67), hz(60), hz(64)};
  for (int i = 0; i < 5; ++i)
    CHECK(near(got[static_cast<std::size_t>(i)], want[i]));
}

TEST_CASE("R10g Arpeggiator, patterns and octaves") {
  const auto run = [](int pattern, int octaves) {
    auto engine = toneAndKeys({BlockType::FxArpeggiator}, true);
    engine->push(Command::setParam(10, P::FxArpeggiator::perHit, 1));
    engine->push(Command::setParam(10, P::FxArpeggiator::pattern, pattern));
    engine->push(Command::setParam(10, P::FxArpeggiator::octaves, octaves));
    for (int k : {60, 64, 67})
      engine->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
    std::vector<int> got;
    for (int i = 0; i < 8; ++i) {
      engine->push(Command::press(1, true));
      render(*engine, 480);
      got.push_back(
          static_cast<int>(std::lround(69.0 + 12.0 * std::log2(pitches(*engine).at(0) / 440.0))));
      engine->push(Command::press(1, false));
      render(*engine, 4800);
    }
    return got;
  };
  CHECK(run(0, 1) == std::vector<int>{60, 64, 67, 60, 64, 67, 60, 64});
  CHECK(run(1, 1) == std::vector<int>{67, 64, 60, 67, 64, 60, 67, 64});
  CHECK(run(2, 1) == std::vector<int>{60, 64, 67, 64, 60, 64, 67, 64});
  CHECK(run(0, 2) == std::vector<int>{60, 64, 67, 72, 76, 79, 60, 64});
  const auto r = run(3, 1);
  CHECK(r == run(3, 1));  // random, but the same every run
  for (int k : r)
    CHECK((k == 60 || k == 64 || k == 67));
}

TEST_CASE(
    "R10g Arpeggiator, on its own: Speed (not synced) and Division (synced) set how fast it moves "
    "through held notes") {
  // Not synced, 8 notes a second: a new note every 30 ticks (6000 samples).
  auto engine = toneAndKeys({BlockType::FxArpeggiator});
  engine->push(Command::setParam(2, P::InputComputerKeyboard::isPolyphonic, 1));
  engine->push(Command::setParam(10, P::FxArpeggiator::sync, 0));
  engine->push(Command::setParam(10, P::FxArpeggiator::speed, 8));
  for (int k : {60, 64, 67})
    engine->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  render(*engine, 48000);
  const auto on = eventsOf(*engine, Event::Type::GateOn, 1);
  REQUIRE(on.size() == 8);
  for (std::size_t i = 1; i < on.size(); ++i)
    CHECK(on[i].sample - on[i - 1].sample == 6000);
  CHECK(are(pitches(*engine), {hz(64)}));  // the 8th note: C E G C E G C E
  // Synced, 1/8 notes at 120 BPM: every 0.25 s.
  auto s = toneAndKeys({BlockType::FxArpeggiator});
  s->push(Command::setParam(2, P::InputComputerKeyboard::isPolyphonic, 1));
  s->push(Command::setParam(10, P::FxArpeggiator::division, 0.5));
  for (int k : {60, 64, 67})
    s->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  render(*s, 48000);
  const auto son = eventsOf(*s, Event::Type::GateOn, 1);
  REQUIRE(son.size() == 4);
  for (std::size_t i = 1; i < son.size(); ++i)
    CHECK(son[i].sample - son[i - 1].sample == 12000);
  // Letting every key go stops it.
  for (int k : {60, 64, 67})
    s->push(Command::noteOff(KB, static_cast<std::uint8_t>(k)));
  render(*s, 480);
  CHECK(pitches(*s).empty());
}

namespace {
int midiOf(double p) {
  return static_cast<int>(std::lround(69.0 + 12.0 * std::log2(p / 440.0)));
}
/// A Tone (1) with a Random Note (10) whose weights are `w` (C…B); then `presses` presses of the
/// Tone's power.
std::vector<int> randomPresses(std::uint64_t seed, const std::array<double, 12>& w, int presses,
                               int key = 0, int low = 60, int high = 71) {
  auto engine = makeEngine(48000, seed, false);
  engine->push(Command::add(1, BlockType::SourceTone, 0, 0));
  engine->push(Command::add(10, BlockType::FxRandomNote, 3, 0));
  for (int i = 0; i < 12; ++i)
    engine->push(Command::setParam(10, static_cast<std::uint8_t>(P::FxRandomNote::w0 + i),
                                   w[static_cast<std::size_t>(i)]));
  engine->push(Command::setParam(10, P::FxRandomNote::key, key));
  engine->push(Command::setParam(10, P::FxRandomNote::low, low));
  engine->push(Command::setParam(10, P::FxRandomNote::high, high));
  std::vector<int> got;
  for (int i = 0; i < presses; ++i) {
    engine->push(Command::press(1, true));
    render(*engine, 480);
    got.push_back(midiOf(pitches(*engine).at(0)));
    engine->push(Command::press(1, false));
    render(*engine, 2400);
  }
  return got;
}
}  // namespace

TEST_CASE(
    "R10h Random Note: each trigger draws a note in the range, weighted by its bar; the same notes "
    "every run") {
  const std::array<double, 12> w = {0.05, 0, 0, 0,    0, 1,
                                    0,    1, 0, 0.05, 1, 0};  // F, G, A# mostly; C and A rarely
  const auto a = randomPresses(1, w, 300, 0, 48, 72);
  std::array<int, 12> count{};
  for (int k : a) {
    CHECK(k >= 48);
    CHECK(k <= 72);
    ++count[static_cast<std::size_t>(k % 12)];
  }
  for (int pc : {1, 2, 3, 4, 6, 8, 11})
    CHECK(count[static_cast<std::size_t>(pc)] == 0);
  for (int pc : {5, 7, 10})
    CHECK(count[static_cast<std::size_t>(pc)] > 60);
  CHECK(count[0] + count[9] > 0);
  CHECK(count[0] + count[9] < 30);
  CHECK(randomPresses(1, w, 300, 0, 48, 72) == a);
  CHECK(randomPresses(99, w, 300, 0, 48, 72) == a);  // the patch seed is visual-only (R12)
}

TEST_CASE(
    "R10h Random Note: Key slides the weights; with no weight in the range the note in plays "
    "unchanged") {
  std::array<double, 12> onlyC{};
  onlyC[0] = 1;
  for (int k : randomPresses(1, onlyC, 20, 2, 48, 72))
    CHECK(k % 12 == 2);  // Key D: C's bar is D's
  for (int k : randomPresses(1, onlyC, 5, 0, 61, 71))
    CHECK(k == 60);  // no C in C#4–B4: the Tone's own note
  const std::array<double, 12> none{};
  for (int k : randomPresses(1, none, 5))
    CHECK(k == 60);
}

TEST_CASE(
    "R10h Random Note with Silent Keys: each held key gets its own random note, picked again at "
    "each strike; then Chord, then Arpeggiator") {
  auto engine = toneAndKeys({BlockType::FxRandomNote}, true);
  for (int k : {50, 57})
    engine->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
  std::vector<std::vector<int>> strikes;
  for (int i = 0; i < 12; ++i) {
    engine->push(Command::press(1, true));
    render(*engine, 480);
    std::vector<int> got;
    for (double p : pitches(*engine))
      got.push_back(midiOf(p));
    for (int k : got) {
      CHECK(k >= 60);
      CHECK(k <= 71);
      CHECK(((k % 12) != 1 && (k % 12) != 3 && (k % 12) != 6 && (k % 12) != 8 && (k % 12) != 10));
    }
    CHECK(!got.empty());
    CHECK(got.size() <= 2);
    strikes.push_back(got);
    engine->push(Command::press(1, false));
    render(*engine, 2400);
  }
  CHECK(std::count_if(strikes.begin(), strikes.end(),
                      [&](const auto& g) { return g != strikes[0]; }) > 0);  // picked again
  // Random Note → Chord → Arpeggiator: one random root per strike, its chord (all major here), one
  // note at a time.
  auto c = toneAndKeys({BlockType::FxArpeggiator, BlockType::FxChord, BlockType::FxRandomNote});
  for (int i = 0; i < 12; ++i)
    c->push(Command::setParam(11, static_cast<std::uint8_t>(P::FxChord::q0 + i), 3));
  c->push(Command::setParam(11, P::FxChord::smooth, 0));
  c->push(Command::setParam(10, P::FxArpeggiator::sync, 0));
  c->push(Command::setParam(10, P::FxArpeggiator::speed, 20));
  c->push(Command::press(1, true));
  render(*c, 480);
  const double root = pitches(*c).at(0);
  render(*c, 2400);  // the Arpeggiator's next step: the third above the same root
  CHECK(near(pitches(*c).at(0), root * std::pow(2.0, 4.0 / 12.0)));
}

TEST_CASE(
    "R10h Random Note: three keys held on a polyphonic keyboard sound three random notes, each let "
    "go with its key") {
  // Owner bug, 2026-11-19: through Random Note a polyphonic keyboard sounded one note, flicking
  // between the held keys.
  auto engine = toneAndKeys({BlockType::FxRandomNote});
  engine->push(Command::setParam(2, P::InputComputerKeyboard::isPolyphonic, 1));
  for (int k : {40, 41, 42}) {
    engine->push(Command::noteOn(KB, static_cast<std::uint8_t>(k)));
    render(*engine, 480);
  }
  const auto held = pitches(*engine);
  CHECK(held.size() == 3);
  engine->push(Command::noteOff(KB, 41));
  render(*engine, 4800);
  const auto two = pitches(*engine);
  CHECK(two.size() == 2);
  for (double p : two)
    CHECK(std::find_if(held.begin(), held.end(), [&](double h) { return near(h, p); }) !=
          held.end());  // the others kept their notes
}

TEST_CASE(
    "CHG-0017: joining or leaving a note effect starts clean, and plain sources are untouched "
    "(R12)") {
  auto engine = toneAndKeys();
  engine->push(Command::noteOn(KB, 60));
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(60)}));
  engine->push(Command::add(10, BlockType::FxChord, 3,
                            0));  // the Tone becomes arranged: the held key is dropped
  render(*engine, 480);
  CHECK(engine->block(1)->arranged);
  CHECK(pitches(*engine).empty());
  engine->push(Command::noteOn(KB, 60));
  render(*engine, 480);
  CHECK(pitches(*engine).size() == 3);
  engine->push(Command::remove(10));
  render(*engine, 480);
  CHECK_FALSE(engine->block(1)->arranged);
  CHECK(pitches(*engine).empty());
  const auto run = [](std::uint32_t block) {
    auto x = toneAndKeys({BlockType::FxChord, BlockType::FxArpeggiator}, true);
    x->push(Command::add(5, BlockType::PowerEmitter, -10, 0));
    x->push(Command::setParam(5, P::PowerEmitter::angle, 0));
    x->push(Command::setParam(5, P::PowerEmitter::selfPoweredMode, 1));
    x->push(Command::setParam(5, P::PowerEmitter::rate, 20));
    x->push(Command::noteOn(KB, 57));
    x->push(Command::noteOn(KB, 64));
    const auto out = render(*x, 48000 * 2, block);
    return std::pair{hashAudio(out), hashEvents(*x)};
  };
  const auto a = run(128);
  CHECK(run(1024) == a);
  CHECK(run(37) == a);
}

TEST_CASE(
    "CHG-0019 Touchpad: a slide moves the held key for an Arpeggiator, which then plays the note "
    "slid to") {
  auto engine = makeEngine(48000, 1, false);
  const BlockType TOUCHPAD = BlockType::InputTouchpad;
  engine->push(Command::add(1, BlockType::SourceTone, 0, 0));
  engine->push(Command::add(2, TOUCHPAD, 0, -3));
  engine->push(Command::add(10, BlockType::FxArpeggiator, 3, 0));
  engine->push(Command::setParam(10, P::FxArpeggiator::sync, 0));
  engine->push(Command::setParam(10, P::FxArpeggiator::speed, 20));
  Command a = Command::noteOn(TOUCHPAD, 52);
  a.id = 2;
  Command b = Command::noteOn(TOUCHPAD, 59);
  b.id = 2;
  engine->push(a);
  engine->push(b);
  const auto heard = [&](int ms) {
    std::vector<double> out;
    for (int t = 0; t < ms; t += 5) {
      render(*engine, 240);
      for (double f : pitches(*engine))
        if (std::none_of(out.begin(), out.end(), [&](double g) { return near(f, g); }))
          out.push_back(f);
    }
    std::sort(out.begin(), out.end());
    return out;
  };
  CHECK(are(heard(400), {hz(52), hz(59)}));
  Command slide = Command::noteExpression(TOUCHPAD, 52, 0, Command::Expression::Bend, 3.0);
  slide.id = 2;  // E → G
  engine->push(slide);
  render(*engine, 240);
  CHECK(are(heard(400), {hz(55), hz(59)}));
}

TEST_CASE(
    "CHG-0019 Touchpad: its pads play like a keyboard's keys (poly by default); a slide bends the "
    "held note, no new attack") {
  auto engine = makeEngine(48000, 1, false);
  const BlockType TOUCHPAD = BlockType::InputTouchpad;
  engine->push(Command::add(1, BlockType::SourceTone, 0, 0));
  engine->push(Command::add(2, TOUCHPAD, 0, -3));
  Command a = Command::noteOn(TOUCHPAD, 52);
  a.id = 2;  // the page names the Touchpad block the pad is on
  Command b = Command::noteOn(TOUCHPAD, 55);
  b.id = 2;
  engine->push(a);
  engine->push(b);
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(52), hz(55)}));  // two pads, two voices
  const auto strikes = eventsOf(*engine, Event::Type::GateOn, 1).size();
  Command slide = Command::noteExpression(TOUCHPAD, 52, 0, Command::Expression::Bend, 1.0);
  slide.id = 2;  // E → F
  engine->push(slide);
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(53), hz(55)}));
  CHECK(eventsOf(*engine, Event::Type::GateOn, 1).size() ==
        strikes);  // legato: nothing struck again
  Command off = Command::noteOff(TOUCHPAD, 52);
  off.id = 2;
  engine->push(off);
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(55)}));
  // Octave moves every pad, as a keyboard's.
  engine->push(Command::setParam(2, P::InputTouchpad::transpose, 1));
  render(*engine, 480);
  CHECK(are(pitches(*engine), {hz(67)}));
}
