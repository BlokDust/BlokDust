// CHG-0016: the Sound Laser (SPEC-SIMULATION-POWER-AND-PARTICLES R7b, SIMULATION-0007): a laser
// whose beam is on while the sources connected to it are louder (or, inverted, quieter) than its
// threshold.
#include <catch2/catch_test_macros.hpp>
#include <utility>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// A sine Tone (1) heard by a Sound Laser (3) that points right at a second Tone (4). Power (2)
/// arrives at `powerAt`. `first` are applied before it (the queue is FIFO: commands pushed after a
/// timed one wait for it).
std::unique_ptr<Engine> scene(std::int64_t powerAt = -1, std::vector<Command> first = {}) {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::SourceTone, 0, 0));
  engine->push(Command::setParam(1, P::SourceTone::waveform, 0));
  engine->push(Command::add(3, BlockType::PowerSoundLaser, 3, 0));
  engine->push(Command::setParam(3, P::PowerSoundLaser::angle, 0));
  engine->push(Command::add(4, BlockType::SourceTone, 10, 0));
  for (const auto& c : first)
    engine->push(c);
  engine->push(Command::add(2, BlockType::PowerPower, -3, 0, powerAt));
  return engine;
}
bool beamOn(const Engine& engine) {
  return engine.block(3)->beamOn;
}
}  // namespace

TEST_CASE(
    "R7b Sound Laser: the beam is on while the Tone it hears is over the threshold, and powers "
    "what it hits") {
  auto engine = scene();
  CHECK(engine->connected(3, 1) == false);  // nothing applied yet
  render(*engine, 24000);
  CHECK(engine->connected(3, 1));
  CHECK_FALSE(engine->connected(3, 4));  // 7 cells away: out of its catchment
  CHECK(beamOn(*engine));  // a powered Tone peaks near −16 dB; the default threshold is −30 dB
  CHECK(engine->block(4)->laserPower == 1);
  Engine::Monitor m[4];
  REQUIRE(engine->monitors(m, 4) == 1);
  CHECK(m[0].v[0] > -20.0f);
  CHECK(m[0].v[0] < -10.0f);
  CHECK(m[0].v[1] == 1.0f);
  engine->push(
      Command::setParam(3, P::PowerSoundLaser::threshold, -6));  // louder than the Tone ever is
  render(*engine, 24000);
  CHECK_FALSE(beamOn(*engine));
  CHECK(engine->block(4)->laserPower == 0);
}

TEST_CASE("R7b Sound Laser: silent, it is off; inverted, it is on until the sound comes") {
  auto engine = scene(48000, {Command::setParam(3, P::PowerSoundLaser::hold, 0)});
  render(*engine, 24000);
  CHECK_FALSE(beamOn(*engine));
  auto inv = scene(48000, {Command::setParam(3, P::PowerSoundLaser::invert, 1),
                           Command::setParam(3, P::PowerSoundLaser::hold, 0)});
  render(*inv, 24000);
  CHECK(beamOn(*inv));
  render(*inv, 48000);  // the Tone is sounding now
  CHECK_FALSE(beamOn(*inv));
}

TEST_CASE("R7b Sound Laser: hold keeps the beam on for at least that long after the sound stops") {
  for (const double hold : {0.0, 0.5}) {
    auto engine = scene();
    engine->push(Command::setParam(3, P::PowerSoundLaser::hold, hold));
    engine->push(Command::remove(
        2, 48000));  // the Tone's power goes at 1 s (release 10 ms, then the level falls)
    render(*engine, 48000);
    REQUIRE(beamOn(*engine));
    std::int64_t off = -1;
    for (int i = 0; i < 480 && off < 0; ++i) {
      render(*engine, 200);
      if (!beamOn(*engine))
        off = engine->sampleClock();
    }
    REQUIRE(off > 0);
    const double after = static_cast<double>(off - 48000) / 48000.0;
    CHECK(after >= hold);
    CHECK(after < hold + 0.25);
  }
}

TEST_CASE(
    "R7b Sound Laser: Band picks what it listens to (a 262 Hz sine is in the lows, not the "
    "highs)") {
  const auto on = [](int band) {
    auto engine = scene();
    engine->push(Command::setParam(3, P::PowerSoundLaser::band, band));
    render(*engine, 48000);
    return beamOn(*engine);
  };
  CHECK(on(0));
  CHECK(on(1));
  CHECK_FALSE(on(3));
}

TEST_CASE("R7b Sound Laser: it hears a source as it sounds, after its effects") {
  auto engine = scene();
  engine->push(Command::add(5, BlockType::FxVolume, 0, 3));
  engine->push(Command::setParam(5, P::FxVolume::gain, -20));  // Tone.Volume: −20 → about −20 dB
  render(*engine, 48000);
  CHECK_FALSE(beamOn(*engine));  // now near −36 dB: under −30
}

TEST_CASE("SPEC-CONNECTIONS-PROXIMITY R2b: a Sound Laser connects to audio sources only") {
  CHECK(kindsMayConnect(BlockKind::AudioSource, BlockKind::Listener));
  CHECK_FALSE(kindsMayConnect(BlockKind::PowerSource, BlockKind::Listener));
  auto engine = makeEngine();
  engine->push(Command::add(1, BlockType::PowerSoundLaser, 0, 0));
  engine->push(Command::add(2, BlockType::PowerEmitter, 2, 0));
  engine->push(Command::add(3, BlockType::PowerPower, -2, 0));
  engine->push(Command::add(4, BlockType::FxFilter, 0, 2));
  engine->push(Command::add(5, BlockType::SourceNoise, 0, -2));
  settle(*engine);
  CHECK_FALSE(engine->connected(1, 2));
  CHECK_FALSE(engine->connected(1, 3));
  CHECK_FALSE(engine->connected(1, 4));
  CHECK(engine->connected(1, 5));
  // It is not part of the Noise's audio chain.
  CHECK(engine->chains().chainOf[static_cast<std::size_t>(engine->slotOf(1))] < 0);
}

TEST_CASE(
    "R12 (CHG-0016): a Sound Laser renders bit-identically whatever the buffer size; more than the "
    "pool stay dark") {
  const auto run = [](std::uint32_t block) {
    auto engine = makeEngine(48000, 1, false);
    engine->push(Command::add(1, BlockType::PowerEmitter, -10, 0));
    engine->push(Command::setParam(1, P::PowerEmitter::angle, 0));
    engine->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
    engine->push(Command::setParam(1, P::PowerEmitter::rate, 30));
    engine->push(Command::add(2, BlockType::SourceTone, 0, 0));
    engine->push(Command::add(3, BlockType::PowerSoundLaser, 3, 0));
    engine->push(Command::setParam(3, P::PowerSoundLaser::angle, 0));
    engine->push(Command::add(4, BlockType::SourceTone, 10, 0));
    engine->push(Command::setParam(4, P::SourceTone::transpose, 7));
    const auto out = render(*engine, 48000 * 3, block);
    return std::pair{hashAudio(out), hashEvents(*engine)};
  };
  const auto a = run(128);
  CHECK(run(1024) == a);
  CHECK(run(37) == a);
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  for (int i = 0; i <= kMaxListeners; ++i)
    e->push(Command::add(static_cast<BlockId>(10 + i), BlockType::PowerSoundLaser, 3, 0));
  render(*e, 24000);
  CHECK(e->block(10)->beamOn);
  CHECK_FALSE(e->block(static_cast<BlockId>(10 + kMaxListeners))->beamOn);
}
