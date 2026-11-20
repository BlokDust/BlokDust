// CHG-0021 (SCOPE-0006): the Stage block: a patch inside a block. Its inner world is an Engine of its own, attached
// by the host, running in step with the outer one (SPEC-SIMULATION-POWER-AND-PARTICLES R13).
#include <catch2/catch_test_macros.hpp>
#include <algorithm>
#include <cmath>
#include <utility>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
std::unique_ptr<Engine> makeChild(const Engine& parent, int sr = 48000) {
  EngineConfig cfg; cfg.sampleRate = sr; cfg.child = true; cfg.parent = &parent;
  return std::make_unique<Engine>(cfg);
}
/// An outer engine with a Stage block (1) at the origin, and its inner world: a Tone (1) held by a Power (2).
struct Nested {
  std::unique_ptr<Engine> outer = makeEngine(48000, 1, false);
  std::unique_ptr<Engine> inner;
  Nested() {
    outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
    outer->prime();
    inner = makeChild(*outer);
    inner->push(Command::add(1, BlockType::SourceTone, 0, 0));
    inner->push(Command::setParam(1, P::SourceTone::waveform, 0));
    inner->push(Command::add(2, BlockType::PowerPower, -3, 0));
    REQUIRE(outer->attachStage(1, inner.get()));
  }
};
}  // namespace

TEST_CASE("R13 Stage: unpowered it is silent; powered, what is inside sounds through it") {
  Nested n;
  CHECK(rms(render(*n.outer, 24000)) == 0.0);            // nothing powers the Stage: its world is off
  CHECK_FALSE(n.inner->block(1)->gated());
  n.outer->push(Command::add(2, BlockType::PowerPower, 3, 0));   // an outer Power beside the Stage
  const auto out = render(*n.outer, 48000);
  CHECK(rms(out, 24000) > 0.01);
  CHECK(n.inner->block(1)->gated());
  CHECK(n.outer->block(1)->power() > 0);
  n.outer->push(Command::remove(2));
  const auto after = render(*n.outer, 48000);
  CHECK(rms(after, 24000) == 0.0);                        // power gone: the inner world is off again
}

TEST_CASE("R13 Stage: it sounds exactly like the same blocks on the outer stage (no master stage of its own)") {
  Nested n;
  n.outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
  const auto nested = render(*n.outer, 48000);
  auto flat = makeEngine(48000, 1, false);
  flat->push(Command::add(1, BlockType::SourceTone, 0, 0));
  flat->push(Command::setParam(1, P::SourceTone::waveform, 0));
  flat->push(Command::add(2, BlockType::PowerPower, -3, 0));
  const auto plain = render(*flat, 48000);
  // The inner Power comes on one tick after the outer one reaches the Stage; from then on the two are the same sound.
  CHECK(std::abs(rms(nested, 24000) / rms(plain, 24000) - 1.0) < 0.01);
  // Gain is plain level.
  n.outer->push(Command::setParam(1, P::SourceStage::gain, 0.5));
  const auto half = render(*n.outer, 48000);
  CHECK(std::abs(rms(half, 24000) / rms(nested, 24000) - 0.5) < 0.01);
}

TEST_CASE("R13 Stage: a particle hit is a moment of power, a held pointer holds it, outer effects apply") {
  Nested n;
  n.outer->push(Command::add(3, BlockType::PowerEmitter, -10, 0));
  n.outer->push(Command::setParam(3, P::PowerEmitter::angle, 0));
  n.outer->push(Command::setParam(3, P::PowerEmitter::selfPoweredMode, 1));
  n.outer->push(Command::setParam(3, P::PowerEmitter::rate, 60));
  n.outer->push(Command::setParam(3, P::PowerEmitter::speed, 12));
  render(*n.outer, 48000 * 3);
  const auto hits = eventsOf(*n.outer, Event::Type::Hit, 1), on = eventsOf(*n.outer, Event::Type::GateOn, 1), off = eventsOf(*n.outer, Event::Type::GateOff, 1);
  REQUIRE(hits.size() >= 2);
  CHECK(on.size() == hits.size());
  CHECK(off.size() >= hits.size() - 1);
  CHECK(off[0].sample - on[0].sample == 7200);   // v1's 0.15 s pulse
  // A press holds it.
  Nested p;
  p.outer->push(Command::press(1, true));
  CHECK(rms(render(*p.outer, 24000), 12000) > 0.01);
  p.outer->push(Command::press(1, false));
  CHECK(rms(render(*p.outer, 24000), 12000) == 0.0);
  // An outer Volume in the Stage's chain turns it down.
  Nested v, w;
  for (auto* x : {&v, &w}) x->outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
  w.outer->push(Command::add(4, BlockType::FxVolume, 0, 3));
  w.outer->push(Command::setParam(4, P::FxVolume::gain, -12));
  const double loud = rms(render(*v.outer, 48000), 24000), quiet = rms(render(*w.outer, 48000), 24000);
  CHECK(quiet < loud * 0.5);
}

TEST_CASE("R13 Stage: the inner world keeps the outer one's ticks and tempo, however the timeline is cut") {
  const auto run = [](std::uint32_t block) {
    auto outer = makeEngine(48000, 1, true);
    outer->push(Command::tempo(90));
    outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
    outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
    outer->push(Command::add(3, BlockType::FxStereoDelay, 0, 3));
    outer->prime();
    auto inner = makeChild(*outer);
    inner->push(Command::add(1, BlockType::PowerEmitter, -8, 0));
    inner->push(Command::setParam(1, P::PowerEmitter::angle, 0));
    inner->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
    inner->push(Command::setParam(1, P::PowerEmitter::sync, 1));
    inner->push(Command::setParam(1, P::PowerEmitter::division, 0.5));
    inner->push(Command::add(2, BlockType::SourceTone, 0, 0));
    inner->push(Command::add(3, BlockType::FxReverb, 3, 0));
    outer->attachStage(1, inner.get());
    outer->push(Command::tempo(140, -1.0, 48000));   // the tempo changes at 1 s: the inner emitter follows
    const auto out = render(*outer, 48000 * 3, block);
    return std::pair{hashAudio(out), inner->tickCount()};
  };
  const auto a = run(128);
  CHECK(a.second == 720);          // 3 s of ticks inside too
  CHECK(run(1024) == a);
  CHECK(run(37) == a);
}

TEST_CASE("R13 Stage: one level only; removing the block lets its world go; at most kMaxStages are attached") {
  auto outer = makeEngine(48000, 1, false);
  outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
  outer->prime();
  auto inner = makeChild(*outer);
  inner->push(Command::add(1, BlockType::SourceStage, 0, 0));
  inner->prime();
  auto deeper = makeChild(*outer);
  CHECK_FALSE(inner->attachStage(1, deeper.get()));       // a Stage inside a Stage has no world
  CHECK(outer->attachStage(1, inner.get()));
  CHECK(outer->stage(1) == inner.get());
  auto plain = makeEngine();
  CHECK_FALSE(outer->attachStage(1, plain.get()));        // only engines made as children
  outer->push(Command::remove(1));
  render(*outer, 480);
  CHECK(outer->stage(1) == nullptr);
  for (int i = 0; i <= kMaxStages; ++i) outer->push(Command::add(static_cast<BlockId>(10 + i), BlockType::SourceStage, i * 4.0, 8));
  outer->prime();
  CHECK(outer->block(10)->poolIndex >= 0);
  CHECK(outer->block(static_cast<BlockId>(10 + kMaxStages))->poolIndex < 0);
  CHECK_FALSE(outer->attachStage(static_cast<BlockId>(10 + kMaxStages), inner.get()));
}

// ---- Playing a Stage from outside (owner, 2026-11-14; UI-0012) ----
namespace {
/// A Stage (1) at the origin with an inner Tone (1) and an inner controller (2) of `inside` beside it; nothing powers it.
struct Played {
  std::unique_ptr<Engine> outer = makeEngine(48000, 1, false);
  std::unique_ptr<Engine> inner;
  explicit Played(BlockType inside) {
    outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
    outer->prime();
    inner = makeChild(*outer);
    inner->push(Command::add(1, BlockType::SourceTone, 0, 0));
    inner->push(Command::add(2, inside, 3, 0));
    REQUIRE(outer->attachStage(1, inner.get()));
  }
  int sounding(int key = -2) const {
    int n = 0;
    for (const auto& v : inner->block(1)->voices) if (v.active && (key == -2 || v.key == key)) ++n;
    return n;
  }
};
Command on(BlockType t, int note, BlockId id = kInvalidBlock) { auto c = Command::noteOn(t, static_cast<std::uint8_t>(note)); c.id = id; return c; }
Command off(BlockType t, int note, BlockId id = kInvalidBlock) { auto c = Command::noteOff(t, static_cast<std::uint8_t>(note)); c.id = id; return c; }
}  // namespace

TEST_CASE("UI-0012 Stage: the computer's keys play a Keyboard inside a Stage from outside it") {
  Played p(BlockType::InputComputerKeyboard);
  CHECK(rms(render(*p.outer, 4800)) == 0.0);
  p.outer->push(on(BlockType::InputComputerKeyboard, 60));
  CHECK(rms(render(*p.outer, 24000), 4800) > 0.01);
  CHECK(p.sounding(60) == 1);
  p.outer->push(off(BlockType::InputComputerKeyboard, 60));
  render(*p.outer, 48000);
  CHECK(p.sounding() == 0);
}

TEST_CASE("UI-0012 Stage: a controller touching the Stage plays its Stage In, an octave moved by the outer one") {
  Played p(BlockType::InputStageIn);
  p.outer->push(Command::add(2, BlockType::InputTouchpad, 3, 0));   // touching the Stage
  p.outer->push(Command::setParam(2, P::InputTouchpad::transpose, 1));
  p.outer->push(on(BlockType::InputTouchpad, 60, 2));
  CHECK(rms(render(*p.outer, 24000), 4800) > 0.01);
  CHECK(p.sounding(72) == 1);                                        // C4 played an octave up outside
  p.outer->push(Command::setParam(2, P::InputTouchpad::transpose, 0));  // the octave moves while it is held:
  p.outer->push(off(BlockType::InputTouchpad, 60, 2));              // the note still ends where it started
  render(*p.outer, 48000);
  CHECK(p.sounding() == 0);
  // Chords stay chords (the Touchpad is polyphonic by default, and Stage In plays as it does).
  p.outer->push(on(BlockType::InputTouchpad, 60, 2));
  p.outer->push(on(BlockType::InputTouchpad, 64, 2));
  p.outer->push(on(BlockType::InputTouchpad, 67, 2));
  render(*p.outer, 4800);
  CHECK(p.sounding() == 3);
  // The Touchpad moves away with its notes held: they end inside.
  p.outer->push(Command::move(2, 40, 0));
  render(*p.outer, 48000);
  CHECK(p.sounding() == 0);
}

TEST_CASE("UI-0012 Stage: Stage In plays as the outside controller is set: Mono/Poly and Silent Keys (owner, 2026-11-20)") {
  Played p(BlockType::InputStageIn);
  p.outer->push(Command::add(2, BlockType::InputTouchpad, 3, 0));
  p.outer->push(Command::setParam(2, P::InputTouchpad::isPolyphonic, 0));  // mono outside: one voice inside
  p.outer->push(on(BlockType::InputTouchpad, 60, 2));
  p.outer->push(on(BlockType::InputTouchpad, 64, 2));
  render(*p.outer, 4800);
  CHECK(p.sounding() == 1);
  p.outer->push(off(BlockType::InputTouchpad, 60, 2));
  p.outer->push(off(BlockType::InputTouchpad, 64, 2));
  render(*p.outer, 48000);
  p.outer->push(Command::setParam(2, P::InputTouchpad::keysSetPitch, 1));  // Silent Keys outside: the pads make no sound
  p.outer->push(on(BlockType::InputTouchpad, 62, 2));
  render(*p.outer, 4800);
  CHECK(p.sounding() == 0);
}

TEST_CASE("UI-0012 Stage: an outer controller reaches the Keyboards inside too, and a key heard twice plays once") {
  Played p(BlockType::InputComputerKeyboard);
  p.outer->push(Command::add(2, BlockType::InputTouchpad, 3, 0));
  p.outer->push(on(BlockType::InputTouchpad, 62, 2));
  render(*p.outer, 4800);
  CHECK(p.sounding(62) == 1);
  p.outer->push(off(BlockType::InputTouchpad, 62, 2));
  render(*p.outer, 48000);
  CHECK(p.sounding() == 0);
  // An outer Computer Keyboard touching the Stage: the inner Keyboard hears the computer's key itself, not again via it.
  p.outer->push(Command::add(3, BlockType::InputComputerKeyboard, -3, 0));
  p.inner->push(Command::setParam(2, P::InputComputerKeyboard::isPolyphonic, 1));
  p.outer->push(on(BlockType::InputComputerKeyboard, 64));
  render(*p.outer, 4800);
  CHECK(p.sounding(64) == 1);
}

TEST_CASE("UI-0012 Stage: notes from outside reach the power sources a Stage In touches") {
  Played p(BlockType::InputStageIn);
  p.inner->push(Command::add(3, BlockType::PowerEmitter, 3, 3));     // the Stage In aims and powers it, as a Keyboard does
  p.outer->push(Command::add(2, BlockType::InputTouchpad, 3, 0));
  p.outer->push(on(BlockType::InputTouchpad, 64, 2));
  render(*p.outer, 4800);
  CHECK(p.inner->block(3)->keyPower == 1);
}

TEST_CASE("Stage: the Microphone and Audio In inside a Stage hear the host input") {
  std::vector<float> inL(48000), inR(48000), outL(48000), outR(48000);
  for (std::size_t i = 0; i < inL.size(); ++i) inL[i] = inR[i] = static_cast<float>(0.25 * dmath::sin(dmath::kTwoPi * 440.0 * double(i) / 48000.0));
  for (const auto t : {BlockType::SourceMicrophone, BlockType::SourceAudioIn}) {
    auto outer = makeEngine(48000, 1, false);
    outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
    outer->push(Command::add(2, BlockType::PowerPower, 3, 0));  // the website's Microphone plays only while powered (R1a)
    outer->prime();
    auto inner = makeChild(*outer);
    inner->push(Command::add(1, t, 0, 0));
    inner->push(Command::add(2, BlockType::PowerPower, -3, 0));
    REQUIRE(outer->attachStage(1, inner.get()));
    for (std::uint32_t d = 0; d < 48000; d += 128) outer->process(inL.data() + d, inR.data() + d, outL.data() + d, outR.data() + d, 128);
    CHECK(rms(outL, 24000) > 0.01);
  }
}

namespace {
/// A Stage (1) powered by an outer Power (2); inside, an Emitter (3) firing right at a Tone (1) 10 cells away.
struct Particles {
  std::unique_ptr<Engine> outer = makeEngine(48000, 1, false);
  std::unique_ptr<Engine> inner;
  explicit Particles(bool keep) {
    outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
    if (keep) outer->push(Command::setParam(1, P::SourceStage::keepParticles, 1));
    outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
    outer->prime();
    inner = makeChild(*outer);
    inner->push(Command::add(1, BlockType::SourceTone, 10, 0));
    inner->push(Command::add(3, BlockType::PowerEmitter, 0, 0));
    inner->push(Command::setParam(3, P::PowerEmitter::selfPoweredMode, 1));
    inner->push(Command::setParam(3, P::PowerEmitter::angle, 0));
    inner->push(Command::setParam(3, P::PowerEmitter::rate, 10));
    REQUIRE(outer->attachStage(1, inner.get()));
    render(*outer, 24000);
    REQUIRE(!inner->particles().empty());
  }
};
}  // namespace

TEST_CASE("R13b Stage: unpowered, its particles vanish (Keep Particles off, the default)") {
  Particles s(false);
  s.outer->push(Command::remove(2));
  render(*s.outer, 480);
  CHECK(s.inner->particles().empty());
}

TEST_CASE("R13b Stage: Keep Particles on, unpowering it leaves its particles flying and hitting; nothing new is emitted") {
  Particles s(true);
  s.outer->push(Command::remove(2));
  render(*s.outer, 480);
  CHECK(!s.inner->particles().empty());
  const auto out = render(*s.outer, 24000);
  CHECK(rms(out) > 0.001);                                 // they reach the Tone, and the hits sound through the Stage
  render(*s.outer, 48000 * 10);
  CHECK(s.inner->particles().empty());                     // the world is off: the Emitter fires no more, so they run out
  CHECK(rms(render(*s.outer, 24000)) == 0.0);
}

TEST_CASE("R13b Stage: kept particles vanish when Keep Particles is turned off, or the world POWER switch goes off") {
  {
    Particles s(true);
    s.outer->push(Command::remove(2));
    render(*s.outer, 480);
    REQUIRE(!s.inner->particles().empty());
    s.outer->push(Command::setParam(1, P::SourceStage::keepParticles, 0));
    render(*s.outer, 480);
    CHECK(s.inner->particles().empty());
  }
  {
    Particles s(true);
    s.outer->push(Command::remove(2));
    render(*s.outer, 480);
    REQUIRE(!s.inner->particles().empty());
    s.outer->push(Command::worldPower(false));    // the Stage was unpowered already: the switch still clears inside
    render(*s.outer, 480);
    CHECK(s.inner->particles().empty());
  }
  {
    Particles s(true);                             // still powered: the world switch takes its power and its particles
    s.outer->push(Command::worldPower(false));
    render(*s.outer, 480);
    CHECK(s.inner->particles().empty());
  }
}

TEST_CASE("R13b Stage: kept particles go on reacting: two Emitters facing each other keep catching and firing, unpowered") {
  auto outer = makeEngine(48000, 1, false);
  outer->push(Command::add(1, BlockType::SourceStage, 0, 0));
  outer->push(Command::setParam(1, P::SourceStage::keepParticles, 1));
  outer->push(Command::add(2, BlockType::PowerPower, 3, 0));
  outer->prime();
  auto inner = makeChild(*outer);
  inner->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  inner->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  inner->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  inner->push(Command::setParam(1, P::PowerEmitter::rate, 200));    // slow: one particle, then the Stage loses power
  inner->push(Command::add(2, BlockType::PowerEmitter, 10, 0));
  inner->push(Command::setParam(2, P::PowerEmitter::angle, 180));
  REQUIRE(outer->attachStage(1, inner.get()));
  for (int i = 0; i < 1200 && inner->particles().empty(); ++i) render(*outer, 200);   // its first, after ~3.3 s
  REQUIRE(inner->particles().size() == 1);
  outer->push(Command::remove(2));
  render(*outer, 480);
  REQUIRE(outer->block(1)->power() == 0);
  // Far longer than one particle lives: each Emitter catches it and fires one back (R5b), so one is always flying.
  double minX = 1e9, maxX = -1e9;
  for (int i = 0; i < 100; ++i) {
    render(*outer, 4800);
    REQUIRE(inner->particles().size() == 1);
    minX = std::min(minX, inner->particles()[0].x); maxX = std::max(maxX, inner->particles()[0].x);
  }
  CHECK(maxX - minX > 5.0);                                      // back and forth between the two
}
