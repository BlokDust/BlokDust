// CHG-0004 3.8: source.granular, v1 Granular.GrainLoop (grains of `grainlength` s every grainlength × 3 / density s
// around `region` ± spread/2) on the engine's own seeded stream.
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
std::vector<float> ramp(48000 * 4);  // 4 s rising ramp: a grain's level shows where in the file it read
struct Run { std::vector<float> out; std::uint64_t hash; };
Run run(std::uint64_t seed, bool powered, std::vector<Command> extra = {}, double seconds = 3.0) {
  for (std::size_t i = 0; i < ramp.size(); ++i) ramp[i] = static_cast<float>(i) / static_cast<float>(ramp.size());
  auto e = makeEngine(48000, seed, false);
  e->push(Command::add(1, BlockType::SourceGranular, 0, 0));
  if (powered) e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  for (const auto& c : extra) e->push(c);
  render(*e, 128);
  REQUIRE(e->attachSample(1, SampleBuffer{ramp.data(), nullptr, static_cast<std::uint32_t>(ramp.size()), 48000.0}));
  auto out = render(*e, static_cast<std::int64_t>(seconds * 48000));
  return {out, hash::audio(out)};
}
double rmsOf(const std::vector<float>& x, std::size_t a, std::size_t b) {
  double s = 0; for (std::size_t i = a; i < b; ++i) s += double(x[i]) * x[i]; return std::sqrt(s / double(b - a));
}
}  // namespace

TEST_CASE("Granular: powered, it plays grains of its file; unpowered, silence (was silent: KNOWN since Phase 1)") {
  CHECK(rmsOf(run(1, true).out, 9600, 144000) > 0.005);
  CHECK(rmsOf(run(1, false).out, 0, 144000) == 0.0);
}

TEST_CASE("Granular: the grain stream is deterministic and independent of the patch seed (visual-only)") {
  CHECK(run(1, true).hash == run(1, true).hash);
  CHECK(run(1, true).hash == run(99, true).hash);
}

TEST_CASE("Granular: Location picks where in the file the grains read (default: the middle once loaded)") {
  // A ramp file: grains near the end are louder than grains near the start.
  const auto early = run(1, true, {Command::setParam(1, P::SourceGranular::region, 0.5), Command::setParam(1, P::SourceGranular::spread, 0.2)});
  const auto late = run(1, true, {Command::setParam(1, P::SourceGranular::region, 3.5), Command::setParam(1, P::SourceGranular::spread, 0.2)});
  CHECK(rmsOf(late.out, 9600, 144000) > 3.0 * rmsOf(early.out, 9600, 144000));
}

TEST_CASE("Granular: density and grain size set the grain rate (grainlength × 3 / density s apart)") {
  // Count grain onsets: a grain's envelope starts from silence, so with tiny spread each onset is a rise from ~0.
  auto onsets = [](double gl, double density) {
    const auto r = run(1, true, {Command::setParam(1, P::SourceGranular::grainlength, gl), Command::setParam(1, P::SourceGranular::density, density),
                                 Command::setParam(1, P::SourceGranular::spread, 0)}, 2.0);
    const double interval = std::round(gl * 2.0 / density * 1500.0) / 1000.0;
    return std::pair{r.out, interval};
  };
  const auto [a, ia] = onsets(0.3, 2);   // 0.45 s apart, grains 0.3 s long: gaps of silence between grains
  int gaps = 0; bool silent = false;
  for (std::size_t i = 4800; i < a.size(); ++i) { const bool s = std::abs(a[i]) < 1e-6; if (s && !silent) ++gaps; silent = s; }
  CHECK(std::abs(gaps - static_cast<int>((2.0 - 0.1) / ia)) <= 1);
}

TEST_CASE("Granular + MPE: a note's slide places the grains across the file (PLUGIN-0004 owner default)") {
  auto level = [](double slide) {
    for (std::size_t i = 0; i < ramp.size(); ++i) ramp[i] = static_cast<float>(i) / static_cast<float>(ramp.size());
    auto e = makeEngine(48000, 1, false);
    e->push(Command::add(1, BlockType::SourceGranular, 0, 0));
    e->push(Command::setParam(1, P::SourceGranular::spread, 0.2));
    e->push(Command::add(3, BlockType::InputMidiController, 0, 3));
    e->push(Command::setParam(3, P::InputMidiController::mpe, 1));
    render(*e, 128);
    REQUIRE(e->attachSample(1, SampleBuffer{ramp.data(), nullptr, static_cast<std::uint32_t>(ramp.size()), 48000.0}));
    e->push(Command::noteOn(BlockType::InputMidiController, 60, 1.0, -1, 1));
    e->push(Command::noteExpression(BlockType::InputMidiController, 60, 1, Command::Expression::Slide, slide));
    const auto out = render(*e, 96000);
    return rmsOf(out, 9600, 96000);
  };
  CHECK(level(0.9) > 3.0 * level(0.1));
}

// Owner (Phase 3 review): the open panel draws where each sampler is playing, one line per voice / grain.
TEST_CASE("Playheads: a held Sample reports its voice's position; Granular one per sounding grain; silent ones none") {
  for (std::size_t i = 0; i < ramp.size(); ++i) ramp[i] = static_cast<float>(i) / static_cast<float>(ramp.size());
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::SourceSample, 0, 0));
  e->push(Command::add(3, BlockType::SourceGranular, 20, 0));
  render(*e, 128);
  REQUIRE(e->attachSample(1, SampleBuffer{ramp.data(), nullptr, static_cast<std::uint32_t>(ramp.size()), 48000.0}));
  REQUIRE(e->attachSample(3, SampleBuffer{ramp.data(), nullptr, static_cast<std::uint32_t>(ramp.size()), 48000.0}));
  std::array<Engine::Playhead, 64> ph{};
  CHECK(e->playheads(ph.data(), 64) == 0);                       // nothing playing
  e->push(Command::press(1, true));                               // hold the Sample (v1: plays from its start)
  render(*e, 24000);                                              // 0.5 s
  int n = e->playheads(ph.data(), 64);
  REQUIRE(n == 1);
  CHECK(ph[0].block == 1);
  CHECK(std::abs(ph[0].seconds - 0.5) < 0.01);
  e->push(Command::add(4, BlockType::PowerPower, 17, 0));         // power the Granular
  render(*e, 48000);
  n = e->playheads(ph.data(), 64);
  int grains = 0;
  for (int i = 0; i < n; ++i) if (ph[static_cast<std::size_t>(i)].block == 3) {
    ++grains;
    CHECK(ph[static_cast<std::size_t>(i)].seconds >= 0.0f); CHECK(ph[static_cast<std::size_t>(i)].seconds <= 4.0f);
  }
  CHECK(grains >= 1);
}
