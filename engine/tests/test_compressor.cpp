// CHG-0014: the Compressor block (Chromium's DynamicsCompressor, as the master bus uses) and the
// emitter's Offset (SPEC-SIMULATION-POWER-AND-PARTICLES R4).
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// Steady-state output level (dB RMS) of a 440 Hz sine of `amp` through a compressor with these
/// settings.
double levelThrough(double amp, double threshold, double knee, double ratio) {
  dsp::MasterCompressor c;
  c.configure(48000);
  c.setParams(threshold, knee, ratio, 0.003, 0.25);
  double sum = 0;
  int n = 0;
  for (int i = 0; i < 96000; ++i) {
    auto l = static_cast<float>(amp * std::sin(2.0 * 3.141592653589793 * 440.0 * i / 48000.0)),
         r = l;
    c.process(l, r);
    if (i >= 48000) {
      sum += double(l) * l;
      ++n;
    }
  }
  return 10.0 * std::log10(sum / n);
}
std::unique_ptr<Engine> toneInto(BlockType fx) {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::SourceTone, 0, 0));
  engine->push(Command::add(2, BlockType::PowerPower, -3, 0));
  engine->push(Command::add(3, fx, 3, 0));
  return engine;
}
/// Samples at which emitter 1 fires.
std::vector<std::int64_t> emits(Engine& engine, double seconds) {
  std::vector<std::int64_t> at;
  for (std::int64_t done = 0; done < static_cast<std::int64_t>(seconds * 48000); done += 480) {
    render(engine, 480);
    for (const auto& ev : engine.events())
      if (ev.type == Event::Type::Emit)
        at.push_back(ev.sample);
    engine.clearEvents();
  }
  return at;
}
}  // namespace

TEST_CASE("CHG-0014 Compressor: levels 20 dB apart come out about 5 dB apart at ratio 4") {
  const double loud = levelThrough(0.5, -40, 0, 4), quiet = levelThrough(0.05, -40, 0, 4);
  CHECK(loud - quiet > 3.0);
  CHECK(loud - quiet < 8.0);
  // Ratio 1 changes nothing: still 20 dB apart.
  CHECK(std::abs(levelThrough(0.5, -40, 0, 1) - levelThrough(0.05, -40, 0, 1) - 20.0) < 0.5);
}

TEST_CASE("CHG-0014 Compressor: below the threshold the dynamics are untouched") {
  const double a = levelThrough(0.01, -20, 0, 8), b = levelThrough(0.001, -20, 0, 8);
  CHECK(std::abs(a - b - 20.0) < 0.5);
}

TEST_CASE("CHG-0014 Compressor block: sounds, and reports its input level and gain reduction") {
  auto engine = toneInto(BlockType::FxCompressor);
  engine->push(Command::setParam(3, P::FxCompressor::threshold, -40));
  engine->push(Command::setParam(3, P::FxCompressor::ratio, 12));
  const auto out = render(*engine, 48000);
  CHECK(rms(out, 24000) > 0.01);
  Engine::Monitor m[4];
  REQUIRE(engine->monitors(m, 4) == 1);
  CHECK(m[0].block == 3);
  CHECK(m[0].v[0] > -30.0f);  // a powered Tone peaks near −16 dB
  CHECK(m[0].v[0] < -6.0f);
  CHECK(m[0].v[1] < -3.0f);  // well over a −40 dB threshold: the gain is down
  // Makeup is plain gain after it: +6 dB doubles the output.
  auto f = toneInto(BlockType::FxCompressor);
  f->push(Command::setParam(3, P::FxCompressor::threshold, -40));
  f->push(Command::setParam(3, P::FxCompressor::ratio, 12));
  f->push(Command::setParam(3, P::FxCompressor::makeup, 6.0206));
  const auto louder = render(*f, 48000);
  CHECK(std::abs(rms(louder, 24000) / rms(out, 24000) - 2.0) < 0.01);
}

TEST_CASE(
    "CHG-0014 Compressor block: more than the pool holds pass audio through; removing one frees "
    "its place") {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::SourceTone, 0, 0));
  engine->push(Command::add(2, BlockType::PowerPower, -3, 0));
  for (int i = 0; i < kMaxCompressors + 2; ++i)
    engine->push(Command::add(static_cast<BlockId>(10 + i), BlockType::FxCompressor, 3, 0));
  const auto out = render(*engine, 24000);
  CHECK(rms(out, 12000) > 0.01);
  CHECK(engine->block(static_cast<BlockId>(10 + kMaxCompressors))->poolIndex < 0);
  engine->push(Command::remove(10));
  engine->push(Command::add(99, BlockType::FxCompressor, 3, 0));
  render(*engine, 480);
  CHECK(engine->block(99)->poolIndex >= 0);
}

TEST_CASE(
    "R4 Offset (CHG-0014): a synced emitter's grid is late by that fraction of its division") {
  auto engine = makeEngine(48000, 1, false);
  engine->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  engine->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  engine->push(Command::setParam(1, P::PowerEmitter::sync, 1));
  engine->push(Command::setParam(1, P::PowerEmitter::division, 1.0));
  engine->push(Command::setParam(1, P::PowerEmitter::offset, 0.5));
  const auto at = emits(*engine, 2.1);  // 120 BPM: beats are 24000 samples apart
  REQUIRE(at.size() == 4);
  for (std::size_t i = 0; i < at.size(); ++i)
    CHECK(at[i] == 12000 + static_cast<std::int64_t>(i) * 24000);
}

TEST_CASE(
    "R4 Offset (CHG-0014): an unsynced emitter waits that fraction of its interval after power "
    "arrives") {
  for (const double offset : {0.0, 0.5}) {
    auto engine = makeEngine(48000, 1, false);
    engine->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
    engine->push(Command::setParam(1, P::PowerEmitter::rate, 60));  // 60 v1 frames = 1 s
    engine->push(Command::setParam(1, P::PowerEmitter::offset, offset));
    engine->push(Command::add(2, BlockType::PowerPower, 3, 0, 48000));  // power arrives at 1 s
    const auto at = emits(*engine, 3.6);
    REQUIRE(at.size() >= 2);
    const std::int64_t first = 48000 + static_cast<std::int64_t>(offset * 48000);
    CHECK(std::abs(at[0] - first) <= 200);  // a tick is 200 samples
    CHECK(at[1] - at[0] == 48000);          // then every interval, as before
  }
}
