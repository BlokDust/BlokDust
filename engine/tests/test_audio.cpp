// Audio rendering for the Phase 0 spike blocks (Tone, Filter, chains to master).
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "helpers.hpp"

using namespace bdtest;

namespace {
int zeroCrossings(const std::vector<float>& v, std::size_t from, std::size_t to) {
  int n = 0;
  for (std::size_t i = from + 1; i < to; ++i) if ((v[i - 1] < 0.0f) != (v[i] < 0.0f)) ++n;
  return n;
}
/// A powered sine Tone (Power block next to it), optionally with a Filter in the chain.
std::unique_ptr<Engine> poweredSine(double transpose = 0, bool filter = false, double gainDb = 0) {
  auto e = makeEngine(48000, 1, /*compressor*/ false);  // these tests measure raw DSP levels
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::setParam(1, P::SourceTone::waveform, 0));
  e->push(Command::setParam(1, P::SourceTone::transpose, transpose));
  e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  if (filter) {
    e->push(Command::add(3, BlockType::FxFilter, 3, 0));
    e->push(Command::setParam(3, P::FxFilter::frequency, 261.6));
    e->push(Command::setParam(3, P::FxFilter::gain, gainDb));
  }
  return e;
}
}  // namespace

TEST_CASE("an unpowered patch is exactly silent") {
  auto e = makeEngine();
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::add(2, BlockType::FxFilter, 3, 0));
  const auto out = render(*e, 48000);
  for (float s : out) REQUIRE(s == 0.0f);
}

TEST_CASE("a powered Tone sounds at v1's base note (261.6 Hz * 2^(transpose/12))") {
  auto e = poweredSine();
  const auto out = render(*e, 48000 * 2);
  CHECK(rms(out, 48000, 96000) > 0.02);
  // a sine at 261.6 Hz crosses zero 523.2 times per second
  CHECK(std::abs(zeroCrossings(out, 48000, 96000) - 523) <= 2);

  auto up = poweredSine(12);
  const auto out2 = render(*up, 48000 * 2);
  CHECK(std::abs(zeroCrossings(out2, 48000, 96000) - 1046) <= 2);
}

TEST_CASE("v1 envelope: attack then decay to sustain (0.5) while powered") {
  auto e = poweredSine();
  const auto out = render(*e, 48000 * 2);
  const double early = rms(out, 0, 480);              // first 10 ms: attack ramp
  const double peak = rms(out, 480, 2400);            // just after attack
  const double sustain = rms(out, 48000, 96000);      // well after the 0.5 s decay
  CHECK(early < peak);
  CHECK_THAT(sustain / peak, Catch::Matchers::WithinAbs(0.5 / 0.97, 0.08));
}

TEST_CASE("Filter at 0 dB is transparent; +20 dB at the tone frequency boosts ~10x") {
  const auto dry = render(*poweredSine(), 48000);
  const auto flat = render(*poweredSine(0, true, 0.0), 48000);
  REQUIRE(dry.size() == flat.size());
  double maxDiff = 0;
  for (std::size_t i = 0; i < dry.size(); ++i) maxDiff = std::max(maxDiff, double(std::abs(dry[i] - flat[i])));
  CHECK(maxDiff < 1e-6);

  const auto boosted = render(*poweredSine(0, true, 20.0), 48000);
  const double ratio = rms(boosted, 24000, 48000) / rms(dry, 24000, 48000);
  CHECK(ratio > 8.0);
  CHECK(ratio < 12.0);
}

TEST_CASE("a Filter only affects sources in its own chain") {
  auto e = poweredSine(0, true, 20.0);
  auto ref = poweredSine(0, true, 20.0);
  // a second, far-away powered tone in its own chain adds a separate, unfiltered signal
  e->push(Command::add(10, BlockType::SourceTone, 100, 100));
  e->push(Command::setParam(10, P::SourceTone::waveform, 0));
  e->push(Command::add(11, BlockType::PowerPower, 103, 100));
  auto solo = makeEngine(48000, 1, false);
  solo->push(Command::add(10, BlockType::SourceTone, 100, 100));
  solo->push(Command::setParam(10, P::SourceTone::waveform, 0));
  solo->push(Command::add(11, BlockType::PowerPower, 103, 100));
  const auto mixed = render(*e, 24000), a = render(*ref, 24000), b = render(*solo, 24000);
  double maxDiff = 0;
  for (std::size_t i = 0; i < mixed.size(); ++i) maxDiff = std::max(maxDiff, double(std::abs(mixed[i] - (a[i] + b[i]))));
  CHECK(maxDiff < 1e-6);
  e->push(Command::remove(10));
  CHECK(e->chains().chainCount == 2);
}

TEST_CASE("every waveform renders finite, bounded audio") {
  for (int w = 0; w < 4; ++w) {
    auto e = poweredSine();
    e->push(Command::setParam(1, P::SourceTone::waveform, w));
    const auto out = render(*e, 24000);
    for (float s : out) { REQUIRE(std::isfinite(s)); REQUIRE(std::abs(s) <= 1.0f); }
    CHECK(rms(out) > 0.01);
  }
}

namespace {
/// Steady-state level of the 261.6 Hz sine through a Filter of `type` at `hz`, relative to the dry sine.
double filterRatio(int type, double hz, double gainDb = 0, double q = 1) {
  auto e = poweredSine(0, true, gainDb);
  e->push(Command::setParam(3, P::FxFilter::type, type));
  e->push(Command::setParam(3, P::FxFilter::frequency, hz));
  e->push(Command::setParam(3, P::FxFilter::Q, q));
  const auto wet = render(*e, 48000), dry = render(*poweredSine(), 48000);
  return rms(wet, 24000, 48000) / rms(dry, 24000, 48000);
}
}  // namespace

TEST_CASE("CHG-0010 Filter types: Low pass keeps lows, cuts highs") {
  CHECK_THAT(filterRatio(1, 4000), Catch::Matchers::WithinAbs(1.0, 0.05));
  CHECK(filterRatio(1, 60) < 0.08);
}

TEST_CASE("CHG-0010 Filter types: High pass keeps highs, cuts lows") {
  CHECK_THAT(filterRatio(2, 30), Catch::Matchers::WithinAbs(1.0, 0.05));
  CHECK(filterRatio(2, 1500) < 0.08);
}

TEST_CASE("CHG-0010 Filter types: Band pass passes its centre at its level, cuts away from it") {
  CHECK_THAT(filterRatio(3, 261.6), Catch::Matchers::WithinAbs(1.0, 0.05));
  CHECK_THAT(filterRatio(3, 261.6, 6.0), Catch::Matchers::WithinAbs(2.0, 0.1));  // gain = the band pass level
  CHECK(filterRatio(3, 4000, 0, 4) < 0.08);
}

TEST_CASE("CHG-0010 Filter: Low pass resonance is the gain, in dB") {
  CHECK_THAT(filterRatio(1, 261.6, 12.0), Catch::Matchers::WithinAbs(3.98, 0.3));  // +12 dB at the corner
}

TEST_CASE("CHG-0010 Filter: Q sets the Peak's width (v1's Q 1 by default)") {
  CHECK(filterRatio(0, 523.2, 20, 14) < 1.3);   // narrow: an octave away is barely touched
  CHECK(filterRatio(0, 523.2, 20, 0.5) > 3.0);  // wide: it reaches the tone
  CHECK_THAT(filterRatio(0, 261.6, 20), Catch::Matchers::WithinAbs(10.0, 0.6));
}
