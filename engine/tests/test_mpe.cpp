// PLUGIN-0004: per-note expression (MPE). Each test compares against a render that reaches the same
// sound without expression, so the checks are exact (the engine is deterministic) rather than
// spectral guesses.
#include <algorithm>
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <vector>

#include "blokdust/mpe.hpp"
#include "helpers.hpp"

using namespace bdtest;
using X = Command::Expression;
constexpr auto MIDI = BlockType::InputMidiController;

namespace {
/// A MIDI Input next to a source (connected by proximity), poly, no glide; notes come from `play`.
template <class F>
std::vector<float> run(BlockType source, F play, double seconds = 0.5, bool mpe = true) {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, MIDI, -3, 0));
  engine->push(Command::setParam(1, P::InputMidiController::isPolyphonic, 1));
  engine->push(Command::setParam(1, P::InputMidiController::glide, 0));
  engine->push(Command::setParam(1, P::InputMidiController::mpe, mpe ? 1 : 0));
  engine->push(Command::add(2, source, 0, 0));
  if (source == BlockType::SourceTone)
    engine->push(Command::setParam(2, P::SourceTone::waveform, 3));  // saw: harmonics
  play(*engine);
  return render(*engine, static_cast<std::int64_t>(seconds * 48000));
}
double rmsOf(const std::vector<float>& x, std::size_t from = 0) {
  double s = 0;
  for (std::size_t i = from; i < x.size(); ++i)
    s += double(x[i]) * x[i];
  return std::sqrt(s / double(x.size() - from));
}
double roughness(const std::vector<float>& x,
                 std::size_t from = 4800) {  // RMS of the first difference: high-frequency energy
  double s = 0;
  for (std::size_t i = from + 1; i < x.size(); ++i) {
    const double d = double(x[i]) - x[i - 1];
    s += d * d;
  }
  return std::sqrt(s / double(x.size() - from));
}
}  // namespace

TEST_CASE(
    "MPE: a note's pitch bend re-pitches only that note (bend +12 on C4 sounds exactly like C5)") {
  const auto bent = run(BlockType::SourceTone, [](Engine& e) {
    e.push(Command::noteOn(MIDI, 60, 1.0, -1, 1));
    e.push(Command::noteExpression(MIDI, 60, 1, X::Bend, 12.0));
  });
  const auto c5 =
      run(BlockType::SourceTone, [](Engine& e) { e.push(Command::noteOn(MIDI, 72, 1.0, -1, 1)); });
  CHECK(rmsOf(bent) > 0.01);
  CHECK(bent == c5);
}

TEST_CASE("MPE: two notes on two channels bend independently") {
  const auto mpe = run(BlockType::SourceTone, [](Engine& e) {
    e.push(Command::noteOn(MIDI, 60, 1.0, -1, 1));
    e.push(Command::noteOn(MIDI, 64, 1.0, -1, 2));
    e.push(Command::noteExpression(MIDI, 64, 2, X::Bend, 3.0));  // E4 → G4; C4 untouched
  });
  const auto plain = run(BlockType::SourceTone, [](Engine& e) {
    e.push(Command::noteOn(MIDI, 60, 1.0, -1, 1));
    e.push(Command::noteOn(MIDI, 67, 1.0, -1, 2));
  });
  CHECK(mpe == plain);
}

TEST_CASE(
    "MPE: the same key on two channels is two notes; note-off releases only its own channel") {
  const auto out = run(
      BlockType::SourceTone,
      [](Engine& e) {
        e.push(Command::noteOn(MIDI, 60, 1.0, -1, 1));
        e.push(Command::noteOn(MIDI, 60, 1.0, -1, 2));
        e.push(Command::noteOff(MIDI, 60, 2400, 1));
      },
      1.0);
  CHECK(rmsOf(out, 36000) >
        0.01);  // channel 2's C4 still sounds long after channel 1's was released
}

TEST_CASE(
    "MIDI Input velocity sets the note's level, MPE or not; MPE pressure swells it from there to "
    "full (owner review 3)") {
  // Owner (Ableton): MPE was much quieter than plain MIDI, even hammering the key: MPE notes
  // started at 0.3 + 0.5 × velocity (at most 0.8), while plain MIDI ignored velocity. Now both
  // start at velocityGain = 0.2 + 0.8 × velocity² (1 at full velocity, never silent); MPE pressure
  // takes it from there up to full. The gain glides (~5 ms), so the steady level is compared after
  // it has settled.
  const auto plainAt = [](double velocity) {
    return run(
        BlockType::SourceTone,
        [=](Engine& e) { e.push(Command::noteOn(MIDI, 60, velocity, -1, 0)); }, 0.5, false);
  };
  const auto mpeAt = [](double velocity, double pressure, bool send = true) {
    return run(BlockType::SourceTone, [=](Engine& e) {
      e.push(Command::noteOn(MIDI, 60, velocity, -1, 1));
      if (send)
        e.push(Command::noteExpression(MIDI, 60, 1, X::Pressure, pressure));
    });
  };
  const double full = rmsOf(plainAt(1.0), 4800);
  CHECK(std::abs(rmsOf(plainAt(0.5), 4800) / full - 0.4) < 0.01);  // plain MIDI follows velocity
  CHECK(std::abs(rmsOf(plainAt(0.0), 4800) / full - 0.2) < 0.01);  // never silent
  CHECK(std::abs(rmsOf(mpeAt(1.0, 0.0), 4800) / full - 1.0) <
        0.01);  // hammered: as loud as plain MIDI
  CHECK(std::abs(rmsOf(mpeAt(1.0, 0.0, false), 4800) / full - 1.0) < 0.01);
  CHECK(std::abs(rmsOf(mpeAt(1.0, 1.0), 4800) / full - 1.0) < 0.01);
  CHECK(std::abs(rmsOf(mpeAt(0.5, 0.0), 4800) / full - 0.4) <
        0.01);  // soft: the same level as plain MIDI
  CHECK(std::abs(rmsOf(mpeAt(0.5, 0.0, false), 4800) / full - 0.4) < 0.01);
  CHECK(std::abs(rmsOf(mpeAt(0.5, 0.5), 4800) / full - 0.7) < 0.01);  // pressure swells it
  CHECK(std::abs(rmsOf(mpeAt(0.5, 1.0), 4800) / full - 1.0) < 0.01);
  // Pressure mapping off: velocity only.
  const auto unmapped = run(BlockType::SourceTone, [](Engine& e) {
    e.push(Command::setParam(1, P::InputMidiController::pressureTo, 0));
    e.push(Command::noteOn(MIDI, 60, 0.5, -1, 1));
    e.push(Command::noteExpression(MIDI, 60, 1, X::Pressure, 1.0));
  });
  CHECK(std::abs(rmsOf(unmapped, 4800) / full - 0.4) < 0.01);
}

TEST_CASE("MPE: pressure changes glide, no zipper crackle (owner, Logic)") {
  // Pressure arriving in steps (as controllers send it, ~every 64 samples) must sound as smooth as
  // a held level.
  const auto steady = run(BlockType::SourceTone, [](Engine& e) {
    e.push(
        Command::setParam(2, P::SourceTone::waveform, 0));  // sine: any step is audible as a click
    e.push(Command::noteOn(MIDI, 48, 0.0, -1, 1));
    e.push(Command::noteExpression(MIDI, 48, 1, X::Pressure, 0.5));
  });
  const auto stepped = run(BlockType::SourceTone, [](Engine& e) {
    e.push(Command::setParam(2, P::SourceTone::waveform, 0));
    e.push(Command::noteOn(MIDI, 48, 0.0, -1, 1));
    for (int i = 0; i < 360; ++i)
      e.push(Command::noteExpression(MIDI, 48, 1, X::Pressure, i % 2 ? 0.0 : 1.0, i * 64));
  });
  CHECK(roughness(stepped) < 1.3 * roughness(steady));
}

TEST_CASE("MPE: slide sets a Tone's brightness (low slide = darker, slide 1 ≈ open)") {
  const auto open =
      run(BlockType::SourceTone, [](Engine& e) { e.push(Command::noteOn(MIDI, 48, 1.0, -1, 1)); });
  const auto dark = run(BlockType::SourceTone, [](Engine& e) {
    e.push(Command::noteOn(MIDI, 48, 1.0, -1, 1));
    e.push(Command::noteExpression(MIDI, 48, 1, X::Slide, 0.2));
  });
  const auto bright = run(BlockType::SourceTone, [](Engine& e) {
    e.push(Command::noteOn(MIDI, 48, 1.0, -1, 1));
    e.push(Command::noteExpression(MIDI, 48, 1, X::Slide, 1.0));
  });
  CHECK(roughness(dark) < 0.25 * roughness(open));
  CHECK(roughness(bright) > 0.8 * roughness(open));
}

TEST_CASE("MPE: a slide sent with the note picks a Sample's start point") {
  // A 1 s ramp from 0 to 1: the first sample played tells where playback started.
  std::vector<float> ramp(48000);
  for (std::size_t i = 0; i < ramp.size(); ++i)
    ramp[i] = static_cast<float>(i) / 48000.0f;
  auto start = [&](double slide) {
    auto engine = makeEngine(48000, 1, false);
    engine->push(Command::add(1, MIDI, -3, 0));
    engine->push(Command::setParam(1, P::InputMidiController::mpe, 1));
    engine->push(Command::add(2, BlockType::SourceSample, 0, 0));
    render(*engine, 128);
    REQUIRE(engine->attachSample(
        2, SampleBuffer{ramp.data(), nullptr, static_cast<std::uint32_t>(ramp.size()), 48000.0}));
    engine->push(Command::noteOn(MIDI, 60, 1.0, -1, 1));
    engine->push(Command::noteExpression(MIDI, 60, 1, X::Slide, slide));
    const auto out = render(*engine, 4800);
    const auto first = std::find_if(out.begin(), out.end(), [](float v) { return v != 0.0f; });
    return first == out.end() ? 0.0f : *first;
  };
  const float early = start(0.0), late = start(0.75);
  CHECK(late > 4.0f * early);
}

TEST_CASE(
    "MIDI Input channel filter: Omni takes every channel; channel 3 only channel 3; MPE on takes "
    "all") {
  auto played = [](int filter, bool mpe, int channel) {
    const auto out = run(
        BlockType::SourceTone,
        [&](Engine& e) {
          e.push(Command::setParam(1, P::InputMidiController::channel, filter));
          e.push(Command::noteOn(MIDI, 60, 1.0, -1, channel));
        },
        0.25, mpe);
    return rmsOf(out) > 0.01;
  };
  CHECK(played(0, false, 5));
  CHECK(played(3, false, 2));  // channel index 2 = MIDI channel 3
  CHECK(!played(3, false, 0));
  CHECK(played(3, true, 0));
}

TEST_CASE(
    "MidiRouter: raw MPE MIDI through the router renders exactly like the equivalent engine "
    "commands") {
  auto setup = [](Engine& e) {
    e.push(Command::add(1, MIDI, -3, 0));
    e.push(Command::setParam(1, P::InputMidiController::isPolyphonic, 1));
    e.push(Command::setParam(1, P::InputMidiController::glide, 0));
    e.push(Command::setParam(1, P::InputMidiController::mpe, 1));
    e.push(Command::add(2, BlockType::SourceTone, 0, 0));
    render(e, 128);
  };
  auto viaMidi = makeEngine(48000, 1, false);
  setup(*viaMidi);
  MidiRouter router;
  router.sync(*viaMidi);
  REQUIRE(router.count() == 1);
  auto send = [&](std::uint8_t s, std::uint8_t a, std::uint8_t b) {
    router.message(s, a, b, -1, [&](const Command& c) { viaMidi->push(c); });
  };
  send(0x91, 60, 127);
  send(0xE1, 0, 96);
  send(0xD1, 64, 0);  // C4 on ch 2, bend +24, pressure ~0.5
  const auto a = render(*viaMidi, 24000);

  auto direct = makeEngine(48000, 1, false);
  setup(*direct);
  direct->push(Command::noteOn(MIDI, 60, 1.0, -1, 1));
  direct->push(Command::noteExpression(MIDI, 60, 1, X::Bend, 0.0));
  direct->push(Command::noteExpression(MIDI, 60, 1, X::Bend, 24.0));
  direct->push(Command::noteExpression(MIDI, 60, 1, X::Pressure, 64 / 127.0));
  const auto b = render(*direct, 24000);
  CHECK(rmsOf(a) > 0.005);
  CHECK(a == b);
}

TEST_CASE(
    "MidiRouter: after many notes across every member channel, a new note still sounds at once "
    "(owner, Logic)") {
  // A controller cycles notes through channels 2–16 and lets each go with pressure 0. Each
  // channel's last pressure must not carry into its next note: otherwise every new note starts
  // silent once all channels have been used.
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, MIDI, -3, 0));
  engine->push(Command::setParam(1, P::InputMidiController::isPolyphonic, 1));
  engine->push(Command::setParam(1, P::InputMidiController::glide, 0));
  engine->push(Command::setParam(1, P::InputMidiController::mpe, 1));
  engine->push(Command::add(2, BlockType::SourceTone, 0, 0));
  render(*engine, 128);
  MidiRouter router;
  router.sync(*engine);
  auto send = [&](std::uint8_t s, std::uint8_t a, std::uint8_t b) {
    router.message(s, a, b, -1, [&](const Command& c) { engine->push(c); });
  };
  for (int n = 0; n < 45; ++n) {
    const auto ch = static_cast<std::uint8_t>(1 + n % 15);
    send(0x90 | ch, static_cast<std::uint8_t>(48 + n % 24), 100);
    for (int p : {30, 90, 40, 0}) {
      send(0xD0 | ch, static_cast<std::uint8_t>(p), 0);
      render(*engine, 480);
    }
    send(0x80 | ch, static_cast<std::uint8_t>(48 + n % 24), 0);
  }
  const auto tail = render(*engine, 48000);  // every note released and faded
  CHECK(rmsOf(tail, 43200) < 1e-4);
  send(0x93, 60, 100);  // a new note on a used channel, before any pressure arrives
  const auto out = render(*engine, 4800);
  CHECK(rmsOf(out, 2400) > 0.01);
}
