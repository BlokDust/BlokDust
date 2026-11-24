// Controllers (MIDI / computer keyboard), Audio In, master compressor and Dust automation mapping.
#include <algorithm>
#include <cmath>
#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "blokdust/dmath.hpp"
#include "helpers.hpp"

using namespace bdtest;
using Catch::Matchers::WithinAbs;

namespace {
int zeroCrossings(const std::vector<float>& v, std::size_t from, std::size_t to) {
  int n = 0;
  for (std::size_t i = from + 1; i < to; ++i)
    if ((v[i - 1] < 0.0f) != (v[i] < 0.0f))
      ++n;
  return n;
}
std::unique_ptr<Engine> keyboardTone() {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::InputMidiController, 0, 0));
  e->push(Command::add(2, BlockType::SourceTone, 3, 0));
  e->push(Command::setParam(2, P::SourceTone::waveform, 0));
  e->push(Command::add(3, BlockType::SourceTone, 30, 0));  // not connected to the controller
  return e;
}
}  // namespace

TEST_CASE("a MIDI note plays connected sources at the note's pitch, and only them") {
  auto e = keyboardTone();
  e->push(Command::noteOn(BlockType::InputMidiController, 69, 1.0, 4800));  // A4 = 440 Hz
  e->push(Command::noteOff(BlockType::InputMidiController, 69, 4800 * 11));
  const auto out = render(*e, 48000 * 2);
  CHECK(eventsOf(*e, Event::Type::GateOn, 2).size() == 1);
  CHECK(eventsOf(*e, Event::Type::GateOff, 2).size() == 1);
  CHECK(eventsOf(*e, Event::Type::GateOn, 3).empty());
  CHECK(std::abs(zeroCrossings(out, 9600, 9600 + 48000 / 2) - 440) <=
        3);  // 0.5 s → 2·440·0.5 crossings
}

TEST_CASE(
    "controller transpose is in octaves; mono legato keeps one voice and returns to a key still "
    "held (owner review 3)") {
  // v1 released the mono voice when its key went up, even with another key still down. Owner: notes
  // snapped instead of gliding. Mono now returns to the newest key still held (gliding), and
  // releases only when no key is held.
  auto e = keyboardTone();
  e->push(Command::setParam(1, P::InputMidiController::transpose, 1));
  e->push(Command::setParam(1, P::InputMidiController::glide, 0));
  e->push(Command::noteOn(BlockType::InputMidiController, 57));  // A3 + 1 octave = 440 Hz
  e->push(Command::noteOn(BlockType::InputMidiController, 64, 1.0, 24000));
  e->push(
      Command::noteOff(BlockType::InputMidiController, 57, 36000));  // older key: nothing happens
  e->push(Command::noteOff(BlockType::InputMidiController, 64, 48000));
  const auto out = render(*e, 48000 * 2);
  CHECK(std::abs(zeroCrossings(out, 4800, 4800 + 12000) - 220) <= 3);  // 440 Hz for 0.25 s
  CHECK(std::abs(zeroCrossings(out, 24000 + 2400, 24000 + 2400 + 9600) - 264) <=
        4);  // E5 + 1 octave = 1319 Hz, 0.2 s
  CHECK(eventsOf(*e, Event::Type::GateOn, 2).size() == 1);
  CHECK(eventsOf(*e, Event::Type::GateOff, 2).size() == 1);
  CHECK(eventsOf(*e, Event::Type::GateOff, 2)[0].sample >= 48000);
}

TEST_CASE(
    "Mono glide: releasing the sounding key glides back to a key still held (owner review 3)") {
  auto e = keyboardTone();
  e->push(Command::setParam(1, P::InputMidiController::glide, 0.1));
  e->push(Command::noteOn(BlockType::InputMidiController, 57));
  e->push(Command::noteOn(BlockType::InputMidiController, 64, 1.0, 24000));
  e->push(Command::noteOff(BlockType::InputMidiController, 64, 48000));  // 57 still held
  render(*e, 48000 + 480);
  const Block* t = e->block(2);
  REQUIRE(t->monoVoice >= 0);
  const Voice& vo = t->voices[static_cast<std::size_t>(t->monoVoice)];
  CHECK(vo.active);
  CHECK(vo.key == 57);
  CHECK(vo.glideLeft > 0);                               // gliding back down, not snapping
  CHECK(eventsOf(*e, Event::Type::GateOff, 2).empty());  // still sounding
  e->push(Command::noteOff(BlockType::InputMidiController, 57));
  render(*e, 4800);
  CHECK(eventsOf(*e, Event::Type::GateOff, 2).size() == 1);
}

TEST_CASE(
    "Mono glide: a key pressed just after the last one was let go still glides from it (owner "
    "review 3)") {
  // Playing quickly, keys rarely overlap: a key pressed within 250 ms of letting go of the last one
  // glides from its pitch and plays the envelope again, instead of starting cold on the new pitch.
  // After a longer rest it starts cold.
  auto e = keyboardTone();
  e->push(Command::setParam(1, P::InputMidiController::glide, 0.1));
  e->push(Command::noteOn(BlockType::InputMidiController, 57));
  e->push(Command::noteOff(BlockType::InputMidiController, 57, 24000));
  e->push(Command::noteOn(BlockType::InputMidiController, 64, 1.0, 24000 + 960));  // 20 ms later
  render(*e, 24000 + 960 + 480);
  const Block* t = e->block(2);
  REQUIRE(t->monoVoice >= 0);
  const Voice& vo = t->voices[static_cast<std::size_t>(t->monoVoice)];
  CHECK(vo.key == 64);
  CHECK(vo.glideLeft > 0);
  CHECK(eventsOf(*e, Event::Type::GateOn, 2).size() == 2);  // the envelope plays again
  int active = 0;
  for (const auto& v : t->voices)
    active += v.active ? 1 : 0;
  CHECK(active == 1);
  e->push(Command::noteOff(BlockType::InputMidiController, 64));
  render(*e, 48000);
  e->push(Command::noteOn(BlockType::InputMidiController, 57));  // after a 1 s rest: no glide
  render(*e, 480);
  CHECK(e->block(2)->voices[static_cast<std::size_t>(e->block(2)->monoVoice)].glideLeft == 0);
}

TEST_CASE("moving a source away from a controller with a held note releases it") {
  auto e = keyboardTone();
  e->push(Command::noteOn(BlockType::InputMidiController, 60));
  e->push(Command::move(2, 20, 20, 24000));
  render(*e, 48000);
  CHECK(eventsOf(*e, Event::Type::GateOff, 2).size() == 1);
  CHECK_FALSE(e->block(2)->gated());
}

TEST_CASE(
    "SPEC-CONNECTIONS-PROXIMITY R2: keyboards power connected Emitters and Lasers while a key is "
    "held; keys never aim them (owner, 2026-11-20)") {
  // Owner: a keyboard is like a Toggle while a key is down. Notes no longer turn them (C was 12
  // o'clock): they keep their own Angle.
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::InputComputerKeyboard, 0, 0));
  e->push(Command::add(2, BlockType::PowerEmitter, 3, 0));
  e->push(Command::add(3, BlockType::PowerLaser, -3, 0));
  e->push(Command::add(4, BlockType::PowerEmitter, 30, 30));  // not connected: never fires
  e->push(Command::setParam(2, P::PowerEmitter::angle, 45));
  e->push(Command::setParam(3, P::PowerLaser::angle, 0));
  render(*e, 4800);
  CHECK(e->connected(1, 2));
  CHECK(e->connected(1, 3));
  CHECK(eventsOf(*e, Event::Type::Emit, 2).empty());  // no key: unpowered
  CHECK(e->beams().empty());
  e->clearEvents();
  e->push(Command::noteOn(BlockType::InputComputerKeyboard, 64));
  render(*e, 4800);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).size() == 1);  // fires at once
  CHECK(eventsOf(*e, Event::Type::Emit, 4).empty());
  CHECK(e->beams().size() == 1);  // the laser holds while the key does
  CHECK(e->block(2)->params[P::PowerEmitter::angle] == 45.0);
  CHECK(e->block(3)->params[P::PowerLaser::angle] == 0.0);
  const auto parts = e->particles();
  REQUIRE(parts.size() == 1);
  CHECK(parts[0].vx > 0.0);
  CHECK(parts[0].vy > 0.0);  // its own 45°
  e->push(Command::noteOn(BlockType::InputComputerKeyboard, 69));
  render(*e, 480);
  CHECK(e->block(3)->params[P::PowerLaser::angle] == 0.0);
  e->push(Command::noteOff(BlockType::InputComputerKeyboard, 64));
  render(*e, 480);
  CHECK(e->beams().size() == 1);  // one key still held: still on
  e->push(Command::noteOff(BlockType::InputComputerKeyboard, 69));
  render(*e, 480);
  e->clearEvents();
  render(*e, 48000 * 3);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).empty());  // every key released: off again
  CHECK(e->beams().empty());
  // A key held while the keyboard moves away leaves no power behind.
  e->push(Command::noteOn(BlockType::InputComputerKeyboard, 60));
  render(*e, 480);
  CHECK(e->beams().size() == 1);
  e->push(Command::move(1, -40, -40));
  render(*e, 480);
  CHECK(e->beams().empty());
}

namespace {
/// The directions (degrees, rounded) the particles in flight are heading.
std::vector<int> particleHeadings(const Engine& e) {
  std::vector<int> out;
  for (const auto& p : e.particles())
    out.push_back(static_cast<int>(std::lround(std::atan2(p.vy, p.vx) * 180.0 / dmath::kPi)));
  std::sort(out.begin(), out.end());
  return out;
}
}  // namespace

TEST_CASE(
    "SPEC-CONNECTIONS-PROXIMITY R2 S5: every key pressed fires the keyboard's Emitter at its own "
    "angle, legato too (owner, CHG-0009)") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::InputComputerKeyboard, 0, 0));
  e->push(Command::add(2, BlockType::PowerEmitter, 3, 0));
  render(*e, 4800);
  e->push(Command::noteOn(BlockType::InputComputerKeyboard, 60));
  render(*e, 4800);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).size() == 1);
  e->clearEvents();
  e->push(Command::noteOn(BlockType::InputComputerKeyboard, 64));  // C still held
  render(*e, 4800);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).size() == 1);
  CHECK(particleHeadings(*e) ==
        std::vector<int>{-90, -90});  // both at the Emitter's own angle (default −90°)
  e->clearEvents();
  e->push(Command::noteOff(BlockType::InputComputerKeyboard, 64));
  render(*e, 480);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).empty());  // a release fires nothing
  e->push(Command::noteOn(BlockType::InputComputerKeyboard,
                          60));  // the held key again (a repeat note-on)
  render(*e, 480);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).size() == 1);
  // The press restarts the repeat interval: no second particle in the same tick from the counter.
  e->clearEvents();
  render(*e, 48000);  // rate 80 v1 frames = 1.33 s: nothing before it
  CHECK(eventsOf(*e, Event::Type::Emit, 2).empty());
}

TEST_CASE(
    "SPEC-CONNECTIONS-PROXIMITY R2 S6: a chord fires once; held keys repeat at the Emitter's rate, "
    "one particle (owner, 2026-11-20)") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::InputComputerKeyboard, 0, 0));
  e->push(Command::add(2, BlockType::PowerEmitter, 3, 0));
  e->push(Command::setParam(1, P::InputComputerKeyboard::isPolyphonic, 1));
  render(*e, 4800);
  e->push(Command::noteOn(BlockType::InputComputerKeyboard, 60));
  e->push(Command::noteOn(BlockType::InputComputerKeyboard, 64));
  e->push(Command::noteOn(BlockType::InputComputerKeyboard, 67));
  render(*e, 480);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).size() ==
        1);  // pressed together: one particle, not three on top of each other
  e->clearEvents();
  render(*e, 48000 * 3 / 2);  // past one 1.33 s interval, short of two
  CHECK(eventsOf(*e, Event::Type::Emit, 2).size() == 1);
  e->push(Command::noteOff(BlockType::InputComputerKeyboard, 64));
  render(*e, 480);
  e->clearEvents();
  render(*e, 48000 * 4 / 3);
  CHECK(eventsOf(*e, Event::Type::Emit, 2).size() == 1);
}

TEST_CASE("Audio In is always on and feeds its chain; without input it is silent") {
  std::vector<float> inL(48000), inR(48000), outL(48000), outR(48000);
  for (std::size_t i = 0; i < inL.size(); ++i)
    inL[i] = inR[i] =
        static_cast<float>(0.25 * dmath::sin(dmath::kTwoPi * 440.0 * double(i) / 48000.0));
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::SourceAudioIn, 0, 0));
  e->push(Command::add(2, BlockType::FxFilter, 3, 0));
  e->push(Command::setParam(2, P::FxFilter::frequency, 440));
  e->push(Command::setParam(2, P::FxFilter::gain, 12));
  for (std::uint32_t d = 0; d < 48000; d += 128)
    e->process(inL.data() + d, inR.data() + d, outL.data() + d, outR.data() + d, 128);
  double peak = 0;
  for (std::size_t i = 24000; i < 48000; ++i)
    peak = std::max(peak, double(std::abs(outL[i])));
  CHECK_THAT(peak, WithinAbs(0.25 * dmath::exp10(12.0 / 20.0),
                             0.01));  // +12 dB at the centre; Audio In chains skip the master stage
  CHECK(eventsOf(*e, Event::Type::GateOn).empty());  // no power involved

  auto silent = makeEngine(48000, 1, false);
  silent->push(Command::add(1, BlockType::SourceAudioIn, 0, 0));
  for (float s : render(*silent, 4800))
    REQUIRE(s == 0.0f);
}

TEST_CASE(
    "Audio In alone is a true bypass: the host input passes through stereo and bit-identical "
    "(owner review 2)") {
  // Owner: BlokDust FX with only an Audio In block was much quieter than the bypassed plugin (mono
  // sum, v1 master compressor and −12 dB master volume). Audio In chains now bypass the master
  // stage.
  std::vector<float> inL(48000), inR(48000), outL(48000), outR(48000);
  for (std::size_t i = 0; i < inL.size(); ++i) {
    inL[i] = static_cast<float>(0.9 * dmath::sin(dmath::kTwoPi * 440.0 * double(i) / 48000.0));
    inR[i] = static_cast<float>(0.5 * dmath::sin(dmath::kTwoPi * 660.0 * double(i) / 48000.0));
  }
  auto e = makeEngine(48000, 1, true);  // master compressor on, as in the plugins
  e->push(Command::add(1, BlockType::SourceAudioIn, 0, 0));
  e->push(Command::add(2, BlockType::SourceTone, 20, 20));  // other blocks on stage don't change it
  for (std::uint32_t d = 0; d < 48000; d += 128)
    e->process(inL.data() + d, inR.data() + d, outL.data() + d, outR.data() + d, 128);
  for (std::size_t i = 480; i < inL.size(); ++i) {
    REQUIRE(outL[i] == inL[i]);
    REQUIRE(outR[i] == inR[i]);
  }  // after the 5 ms routing fade-in

  e->push(Command::setParam(1, P::SourceAudioIn::gain, 0.5));
  for (std::uint32_t d = 0; d < 48000; d += 128)
    e->process(inL.data() + d, inR.data() + d, outL.data() + d, outR.data() + d, 128);
  for (std::size_t i = 4800; i < inL.size(); ++i) {
    REQUIRE(outL[i] == 0.5f * inL[i]);
    REQUIRE(outR[i] == 0.5f * inR[i]);
  }
}

TEST_CASE(
    "Plugins: Microphone (labelled Audio Input) is the DAW track and passes through like Audio In "
    "(owner review 2)") {
  std::vector<float> inL(9600), inR(9600), outL(9600), outR(9600);
  for (std::size_t i = 0; i < inL.size(); ++i) {
    inL[i] = static_cast<float>(0.8 * dmath::sin(0.01 * double(i)));
    inR[i] = -0.5f * inL[i];
  }
  auto e = std::make_unique<Engine>(EngineConfig{48000, 1, true, /*hostInput=*/true});
  e->push(Command::add(1, BlockType::SourceMicrophone, 0, 0));
  e->push(Command::add(2, BlockType::SourceMicrophone, 0,
                       6));  // duplicated: twice as loud, as the owner found
  for (std::uint32_t d = 0; d < 9600; d += 128)
    e->process(inL.data() + d, inR.data() + d, outL.data() + d, outR.data() + d, 128);
  for (std::size_t i = 480; i < inL.size(); ++i) {
    REQUIRE(outL[i] == 2.0f * inL[i]);
    REQUIRE(outR[i] == 2.0f * inR[i]);
  }
}

TEST_CASE("Microphone gain scales its v1 level (owner review 2)") {
  std::vector<float> in(48000), outL(48000), outR(48000);
  for (std::size_t i = 0; i < in.size(); ++i)
    in[i] = static_cast<float>(0.25 * dmath::sin(dmath::kTwoPi * 440.0 * double(i) / 48000.0));
  auto peakFor = [&](double gain) {
    auto e = makeEngine(48000, 1, false);
    e->push(Command::add(1, BlockType::SourceMicrophone, 0, 0));
    e->push(Command::add(2, BlockType::PowerPower, -3,
                         0));  // the website's Microphone plays only while powered (R1a)
    e->push(Command::setParam(1, P::SourceMicrophone::gain, gain));
    for (std::uint32_t d = 0; d < 48000; d += 128)
      e->process(in.data() + d, in.data() + d, outL.data() + d, outR.data() + d, 128);
    double p = 0;
    for (std::size_t i = 24000; i < 48000; ++i)
      p = std::max(p, double(std::abs(outL[i])));
    return p;
  };
  CHECK_THAT(peakFor(2.0) / peakFor(1.0), WithinAbs(2.0, 1e-3));
}

TEST_CASE(
    "SPEC-SIMULATION-POWER-AND-PARTICLES R1a: the website's Microphone is silent until it is "
    "powered (CHG-0035)") {
  std::vector<float> in(48128), outL(48128), outR(48128);  // whole 128-frame blocks from 24000
  for (std::size_t i = 0; i < in.size(); ++i)
    in[i] = static_cast<float>(0.25 * dmath::sin(dmath::kTwoPi * 440.0 * double(i) / 48000.0));
  auto peak = [&](std::size_t from, std::size_t to) {
    double p = 0;
    for (std::size_t i = from; i < to; ++i)
      p = std::max(p, double(std::abs(outL[i])));
    return p;
  };
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::SourceMicrophone, 0, 0));
  e->push(Command::add(3, BlockType::FxDistortion, 3,
                       0));  // an effect on it, as the owner had: still silent
  e->push(Command::add(2, BlockType::PowerPower, -30, 0));  // far away: not connected
  for (std::uint32_t d = 0; d < 24000; d += 128)
    e->process(in.data() + d, in.data() + d, outL.data() + d, outR.data() + d, 128);
  CHECK(peak(0, 24000) == 0.0);
  e->push(Command::move(2, -3, 0, 24000));  // the Power comes next to it
  for (std::uint32_t d = 24000; d < 48000; d += 128)
    e->process(in.data() + d, in.data() + d, outL.data() + d, outR.data() + d, 128);
  CHECK(peak(36000, 48000) > 0.01);
}

TEST_CASE("Plugin Audio Input (the Microphone with host input) stays always on (PLUGIN-0002)") {
  std::vector<float> in(9600), outL(9600), outR(9600);
  for (std::size_t i = 0; i < in.size(); ++i)
    in[i] = static_cast<float>(0.5 * dmath::sin(0.01 * double(i)));
  auto e = std::make_unique<Engine>(EngineConfig{48000, 1, true, /*hostInput=*/true});
  e->push(Command::add(1, BlockType::SourceMicrophone, 0, 0));
  for (std::uint32_t d = 0; d < 9600; d += 128)
    e->process(in.data() + d, in.data() + d, outL.data() + d, outR.data() + d, 128);
  CHECK(outL[9000] == in[9000]);
}

TEST_CASE(
    "v1 master compressor (Chromium DynamicsCompressor port): +2.08 dB make-up below the knee, "
    "loud input reduced") {
  auto make = [](bool comp, double gainDb) {
    auto e = makeEngine(48000, 1, comp);
    e->push(Command::add(1, BlockType::SourceTone, 0, 0));
    e->push(Command::setParam(1, P::SourceTone::waveform, 0));
    e->push(Command::add(2, BlockType::PowerPower, -3, 0));
    e->push(Command::add(3, BlockType::FxFilter, 3, 0));
    e->push(Command::setParam(3, P::FxFilter::frequency, 261.6));
    e->push(Command::setParam(3, P::FxFilter::gain, gainDb));
    return render(*e, 48000);
  };
  auto peak = [](const std::vector<float>& v, std::size_t from) {
    double p = 0;
    for (std::size_t i = from; i < v.size(); ++i)
      p = std::max(p, double(std::abs(v[i])));
    return p;
  };
  // Below the knee (sustained sine ≈ −16 dBFS before master volume): only Chromium's make-up gain,
  // (1/sat(1))^0.6 for threshold −8, knee 10, ratio 8 = +2.0803 dB (computed independently from
  // dynamics_compressor.cc). Window starts after the envelope decay (0.51 s) plus the 6 ms
  // look-ahead delay.
  const double quietRaw = peak(make(false, 0), 30000), quiet = peak(make(true, 0), 30000);
  CHECK_THAT(20.0 * std::log10(quiet / quietRaw), WithinAbs(2.0803, 0.01));
  // +30 dB at the fundamental drives the compressor ~20 dB over threshold: gain is reduced well
  // below make-up.
  const double loudRaw = peak(make(false, 30), 24000), loud = peak(make(true, 30), 24000);
  CHECK(20.0 * std::log10(loud / loudRaw) < -6.0);
  CHECK(loud < 1.0);
}

TEST_CASE("Dust automation maps 0..1 through the v1 slider range and its inverse transform") {
  double v = 0;
  REQUIRE(Engine::mapAutomation(BlockType::PowerEmitter, P::PowerEmitter::rate, 0.0, v));
  CHECK(v == 509.0);  // ui = 1, param = 510 − ui
  REQUIRE(Engine::mapAutomation(BlockType::PowerEmitter, P::PowerEmitter::rate, 1.0, v));
  CHECK(v == 10.0);
  REQUIRE(Engine::mapAutomation(BlockType::PowerEmitter, P::PowerEmitter::angle, 0.5, v));
  CHECK(v == -90.0);  // ui = 0, param = ui − 90 (up)
  REQUIRE(Engine::mapAutomation(BlockType::FxFilter, P::FxFilter::gain, 0.75, v));
  CHECK(v == 17.5);  // −35..35
  CHECK_FALSE(
      Engine::mapAutomation(BlockType::PowerEmitter, P::PowerEmitter::selfPoweredMode, 0.5, v));
}

TEST_CASE("applyNow keeps order with queued commands (plugin automation on the very first block)") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::FxFilter, 0, 0));  // queued, not yet applied
  e->applyNow(Command::setParam(1, P::FxFilter::gain, 17.5));
  REQUIRE(e->block(1) != nullptr);
  CHECK(e->block(1)->params[P::FxFilter::gain] == 17.5);
}

TEST_CASE(
    "Review 2026-11-06: polyphonic keyboard plays several notes at once (v1 CreateVoices, 9 "
    "voices)") {
  auto e = keyboardTone();
  e->push(Command::setParam(1, P::InputMidiController::isPolyphonic, 1));
  for (int k : {60, 64, 67})
    e->push(
        Command::noteOn(BlockType::InputMidiController, static_cast<std::uint8_t>(k), 1.0, 4800));
  render(*e, 9600);
  int active = 0;
  for (const auto& v : e->block(2)->voices)
    active += v.active ? 1 : 0;
  CHECK(active == 3);
  CHECK(eventsOf(*e, Event::Type::GateOn, 2).size() == 3);
  // the UI's Mono/Poly switch writes `polyphonic` (v1 Keyboard.SetParam), which also counts
  auto m = keyboardTone();
  m->push(Command::setParam(1, P::InputMidiController::polyphonic, 1));
  for (int k : {60, 64})
    m->push(Command::noteOn(BlockType::InputMidiController, static_cast<std::uint8_t>(k)));
  render(*m, 480);
  CHECK(eventsOf(*m, Event::Type::GateOn, 2).size() == 2);
}

TEST_CASE(
    "Review 2026-11-06: polyphony steals the oldest voice after 9 notes, without retriggering") {
  auto e = keyboardTone();
  e->push(Command::setParam(1, P::InputMidiController::isPolyphonic, 1));
  for (int k = 0; k < 10; ++k)
    e->push(Command::noteOn(BlockType::InputMidiController, static_cast<std::uint8_t>(50 + k)));
  render(*e, 480);
  CHECK(eventsOf(*e, Event::Type::GateOn, 2).size() == 9);
  bool hasFirst = false, hasLast = false;
  for (const auto& v : e->block(2)->voices) {
    hasFirst |= v.active && v.key == 50;
    hasLast |= v.active && v.key == 59;
  }
  CHECK_FALSE(hasFirst);
  CHECK(hasLast);
}

TEST_CASE(
    "Review 2026-11-06: mono glide ramps the pitch linearly over `glide` seconds (Tone "
    "linearRampToValue)") {
  auto e = keyboardTone();
  e->push(Command::setParam(1, P::InputMidiController::glide, 0.5));
  e->push(Command::noteOn(BlockType::InputMidiController, 57));  // 220 Hz, triggered: no glide
  e->push(Command::noteOn(BlockType::InputMidiController, 69, 1.0, 24000));  // → 440 Hz over 0.5 s
  const auto out = render(*e, 72000 + 9600);
  const int start = zeroCrossings(out, 4800, 4800 + 4800);  // 220 Hz: ~44 crossings in 0.1 s
  const int mid =
      zeroCrossings(out, 24000 + 10800, 24000 + 10800 + 2400);  // ~330 Hz half way: ~33 in 0.05 s
  const int end = zeroCrossings(out, 72000, 72000 + 4800);      // 440 Hz: ~88 in 0.1 s
  CHECK(std::abs(start - 44) <= 2);
  CHECK(std::abs(mid - 33) <= 3);
  CHECK(std::abs(end - 88) <= 2);
  CHECK(eventsOf(*e, Event::Type::GateOn, 2).size() == 1);
}
