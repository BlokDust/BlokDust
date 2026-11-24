// CHG-0004 3.5 (SIMULATION-0003): tempo-synced emitters and pulses, following the patch's or the
// host's tempo and transport position.
#include <algorithm>
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// Samples at which a synced, self-powered emitter fires over `seconds`.
std::vector<std::int64_t> emissions(double division, std::vector<Command> extra, double seconds) {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::setParam(1, P::PowerEmitter::sync, 1));
  e->push(Command::setParam(1, P::PowerEmitter::division, division));
  for (const auto& c : extra)
    e->push(c);
  std::vector<std::int64_t> at;
  for (std::int64_t done = 0; done < static_cast<std::int64_t>(seconds * 48000); done += 480) {
    render(*e, 480);
    for (const auto& ev : e->events())
      if (ev.type == Event::Type::Emit)
        at.push_back(ev.sample);
    e->clearEvents();
  }
  return at;
}
}  // namespace

TEST_CASE(
    "Tempo sync: an emitter on quarter notes at 120 BPM fires every 0.5 s, from the downbeat") {
  const auto at = emissions(1.0, {}, 2.1);
  REQUIRE(at.size() == 5);  // beats 0, 1, 2, 3, 4
  for (std::size_t i = 0; i < at.size(); ++i)
    CHECK(at[i] == static_cast<std::int64_t>(i) * 24000);
}

TEST_CASE("Tempo sync: division in beats and tempo changes (60 BPM, half notes → every 2 s)") {
  const auto at = emissions(2.0, {Command::tempo(60.0)}, 4.1);
  REQUIRE(at.size() == 3);
  CHECK(at[1] == 96000);
  CHECK(at[2] == 192000);
}

TEST_CASE(
    "Tempo sync: the host's transport position realigns the grid (jump to beat 0.9: next emission "
    "0.1 beat later)") {
  // At 120 BPM, 0.1 beat = 0.05 s = 2400 samples (12 ticks at 240 Hz).
  const auto at = emissions(1.0, {Command::tempo(120.0, 0.9)}, 0.6);
  REQUIRE(at.size() >= 2);
  CHECK(at[0] == 0);  // started mid-slot: fires at once (as an unsynced emitter does when powered)
  CHECK(at[1] == 2400);  // the grid's beat 1
}

TEST_CASE("Tempo sync off: v1 frame timing is unchanged") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  e->push(Command::tempo(200.0));  // tempo alone changes nothing
  auto count = [&] {
    int n = 0;
    for (const auto& ev : e->events())
      n += ev.type == Event::Type::Emit;
    return n;
  };
  render(*e, 48000);
  CHECK(count() == 0);  // rate 80 frames at 60 fps: the first after 1.33 s, whatever the tempo
  render(*e, 19200);
  CHECK(count() == 1);
}

TEST_CASE(
    "Pulse: its Pulse length slider sets how long each pulse powers the sources (v1 "
    "Pulse.pulseLength; was fixed at 0.15 s)") {
  // Found 2026-11-07 while adding tempo sync. Layout from the toggle-pulse golden: an emitter above
  // a Pulse beside a tone.
  auto gateLength = [](double seconds) {
    auto e = makeEngine(48000, 1, false);
    e->push(Command::add(1, BlockType::PowerEmitter, 20, -10));
    e->push(Command::setParam(1, P::PowerEmitter::angle, 90));
    e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
    e->push(Command::setParam(1, P::PowerEmitter::speed, 6));
    e->push(Command::setParam(1, P::PowerEmitter::rate, 200));
    e->push(Command::add(2, BlockType::PowerPulse, 20, 0));
    e->push(Command::setParam(2, P::PowerPulse::pulseLength, seconds));
    e->push(Command::add(3, BlockType::SourceTone, 24, 2));
    std::int64_t on = -1, off = -1;
    for (int i = 0; i < 1000 && off < 0; ++i) {  // the first hit lands at ~3.7 s
      render(*e, 480);
      for (const auto& ev : e->events()) {
        if (ev.block != 3)
          continue;
        if (ev.type == Event::Type::GateOn && on < 0)
          on = ev.sample;
        if (ev.type == Event::Type::GateOff && on >= 0 && off < 0)
          off = ev.sample;
      }
      e->clearEvents();
    }
    return on >= 0 && off > on ? static_cast<double>(off - on) / 48000.0 : -1.0;
  };
  CHECK(std::abs(gateLength(0.15) - 0.15) < 0.01);
  CHECK(std::abs(gateLength(0.5) - 0.5) < 0.01);
}

TEST_CASE(
    "Tempo sync: triplet divisions (1/8T = a third of a beat: every 8000 samples at 120 BPM) "
    "(owner)") {
  const auto at = emissions(1.0 / 3.0, {}, 0.65);
  REQUIRE(at.size() == 4);
  for (std::size_t i = 0; i < at.size(); ++i)
    CHECK(at[i] == static_cast<std::int64_t>(i) * 8000);
}

TEST_CASE(
    "Tempo sync: swing delays every second emission (1 = triplet shuffle); 0 is straight (owner)") {
  const auto swung = emissions(0.5, {Command::setParam(1, P::PowerEmitter::swing, 1.0)}, 0.95);
  REQUIRE(swung.size() == 4);  // 8ths at 120 BPM: beat 0, 0.667, 1, 1.667
  CHECK(swung[0] == 0);
  CHECK(swung[1] == 16000);
  CHECK(swung[2] == 24000);
  CHECK(swung[3] == 40000);
  const auto half = emissions(0.5, {Command::setParam(1, P::PowerEmitter::swing, 0.5)}, 0.45);
  REQUIRE(half.size() == 2);
  CHECK(half[1] == 14000);  // 0.5 x (1 + 0.5/3) beats = 0.5833 beat
  CHECK(emissions(0.5, {Command::setParam(1, P::PowerEmitter::swing, 0.0)}, 1.05) ==
        emissions(0.5, {}, 1.05));
}

TEST_CASE(
    "Tempo sync: a synced laser turns once every turnBeats at the tempo, negative turns "
    "anticlockwise (owner)") {
  auto angleAfter = [](double seconds, double turnBeats, double bpm) {
    auto e = makeEngine(48000, 1, false);
    e->push(Command::add(1, BlockType::PowerLaser, 0, 0));
    e->push(Command::add(2, BlockType::PowerPower, -3,
                         0));  // powered (v1 lasers turn only while powered)
    e->push(Command::setParam(1, P::PowerLaser::sync, 1));
    e->push(Command::setParam(1, P::PowerLaser::turnBeats, turnBeats));
    e->push(Command::tempo(bpm));
    render(*e, 128);
    double a0 = 0;
    for (const auto& b : e->blocks())
      if (b.alive && b.id == 1)
        a0 = b.params[P::PowerLaser::angle];
    render(*e, static_cast<std::int64_t>(seconds * 48000));
    for (const auto& b : e->blocks())
      if (b.alive && b.id == 1) {
        double d = std::fmod(b.params[P::PowerLaser::angle] - a0 + 720.0, 360.0);
        return d;
      }
    return -1.0;
  };
  CHECK(std::abs(angleAfter(0.5, 4, 120) - 90.0) <
        1.0);  // 4 beats = 2 s per turn: a quarter turn in 0.5 s
  CHECK(std::abs(angleAfter(0.5, -4, 120) - 270.0) < 1.0);  // negative: anticlockwise
  CHECK(std::abs(angleAfter(0.5, 4, 60) - 45.0) < 1.0);     // half the tempo, half the speed
}

TEST_CASE(
    "Tempo sync: the DAW transport starting resyncs the world, so every take from bar 1 plays the "
    "same (owner review 2)") {
  // Owner (Ableton): pressing play/stop repeatedly shifted the synced sounds: particles still in
  // flight and the laser's turn carried over from before. Two engines with different histories must
  // match once the transport starts.
  struct Take {
    std::vector<std::pair<int, std::int64_t>> events;
    double laserAngle = 0;
    std::size_t particles = 0;
  };
  auto take = [](double secondsBefore) {
    auto e = makeEngine(48000, 1, false);
    e->push(Command::add(1, BlockType::PowerEmitter, -10, 0));
    e->push(Command::setParam(1, P::PowerEmitter::angle, 0));
    e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
    e->push(Command::setParam(1, P::PowerEmitter::sync, 1));
    e->push(Command::setParam(1, P::PowerEmitter::division, 1));
    e->push(Command::add(2, BlockType::SourceTone, 0, -0.5));
    e->push(Command::add(3, BlockType::PowerLaser, 0, 12));
    e->push(Command::add(4, BlockType::PowerPower, -3, 12));
    e->push(Command::setParam(3, P::PowerLaser::sync, 1));
    e->push(Command::setParam(3, P::PowerLaser::turnBeats, 4));
    // Before: the transport stopped (no position), the world free-running at the host's tempo.
    e->push(Command::tempo(120.0));
    render(*e, static_cast<std::int64_t>(secondsBefore * 48000));
    e->clearEvents();
    const std::int64_t start = static_cast<std::int64_t>(secondsBefore * 48000);
    // Play from bar 1.
    e->applyNow(Command::tempo(120.0, 0.0, -1,
                               /*transportStart=*/true));  // as the plugin does, at the block start
    Take t;
    for (int i = 0; i < 300; ++i) {
      render(*e, 480);
      for (const auto& ev : e->events())
        if (ev.type == Event::Type::Emit || ev.type == Event::Type::Hit)
          t.events.emplace_back(static_cast<int>(ev.type), ev.sample - start);
      e->clearEvents();
      if (i == 150)
        t.particles = e->particles().size();
    }
    for (const auto& b : e->blocks())
      if (b.alive && b.id == 3)
        t.laserAngle = b.params[P::PowerLaser::angle];
    return t;
  };
  const Take a = take(1.37), b = take(0.71);
  REQUIRE(a.events.size() > 4);
  CHECK(a.events == b.events);
  CHECK(a.particles == b.particles);
  CHECK(std::abs(a.laserAngle - b.laserAngle) < 1e-6);
  const auto firstEmit = std::find_if(a.events.begin(), a.events.end(), [](const auto& ev) {
    return ev.first == static_cast<int>(Event::Type::Emit);
  });
  REQUIRE(firstEmit != a.events.end());
  CHECK(firstEmit->second == 0);  // on the downbeat
}

namespace {
void tone(Engine& e, BlockId id) {
  e.push(Command::add(id, BlockType::SourceTone, 0, 0));
  e.push(Command::setParam(id, P::SourceTone::waveform, 0));
}
/// A powered tone through a Stereo Delay; `setup` sets the delay's params, `later` is pushed after
/// 0.5 s.
std::vector<float> delayed(std::vector<Command> setup, std::vector<Command> later = {}) {
  auto e = makeEngine();
  tone(*e, 1);
  e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  e->push(Command::add(3, BlockType::FxStereoDelay, 3, 0));
  for (const auto& c : setup)
    e->push(c);
  auto out = render(*e, 24000);
  for (const auto& c : later)
    e->push(c);
  const auto rest = render(*e, 48000);
  out.insert(out.end(), rest.begin(), rest.end());
  return out;
}
}  // namespace

TEST_CASE(
    "Tempo sync: a synced Stereo Delay's time is its beats at the tempo (owner, 2026-11-10)") {
  namespace D = P::FxStereoDelay;
  // 1/8 (half a beat) at 120 BPM is v1's 0.25 s default, sample for sample.
  CHECK(hashAudio(delayed(
            {Command::setParam(3, D::sync, 1), Command::setParam(3, D::delayBeats, 0.5)})) ==
        hashAudio(delayed({Command::setParam(3, D::delayTime, 0.25)})));
  // At 60 BPM the same note is 0.5 s.
  CHECK(hashAudio(delayed({Command::tempo(60.0), Command::setParam(3, D::sync, 1),
                           Command::setParam(3, D::delayBeats, 0.5)})) ==
        hashAudio(delayed({Command::setParam(3, D::delayTime, 0.5)})));
  // A tempo change while playing glides to the new time, as moving Delay Time does.
  CHECK(hashAudio(
            delayed({Command::setParam(3, D::sync, 1), Command::setParam(3, D::delayBeats, 0.5)},
                    {Command::tempo(60.0)})) ==
        hashAudio(delayed({Command::setParam(3, D::delayTime, 0.25)},
                          {Command::setParam(3, D::delayTime, 0.5)})));
  // Unsynced, the tempo changes nothing.
  CHECK(hashAudio(delayed({Command::setParam(3, D::delayTime, 0.25)}, {Command::tempo(60.0)})) ==
        hashAudio(delayed({Command::setParam(3, D::delayTime, 0.25)})));
  // Long notes stop at 1 s (half notes at 60 BPM would be 2 s).
  CHECK(hashAudio(delayed({Command::tempo(60.0), Command::setParam(3, D::sync, 1),
                           Command::setParam(3, D::delayBeats, 2)})) ==
        hashAudio(delayed({Command::tempo(60.0), Command::setParam(3, D::sync, 1),
                           Command::setParam(3, D::delayBeats, 1)})));
}
