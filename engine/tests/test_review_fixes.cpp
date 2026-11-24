// Phase 1 review fixes (2026-11-06), each a regression test that failed before its fix:
//   - AutoWah, Chomp, Chopper, PitchShifter and Convolver did nothing (no DSP);
//   - pressing a source / particle emitter did not power it (v1 Source.MouseDown → AddPower).
#include <algorithm>
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <vector>

#include "blokdust/convolver.hpp"
#include "helpers.hpp"

using namespace bdtest;

namespace {
std::vector<float> renderTone(BlockType fx, bool withFx) {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(
      Command::setParam(1, P::SourceTone::waveform, 3));  // saw: harmonics for the filters to move
  e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  if (withFx)
    e->push(Command::add(3, fx, 3, 0));
  return render(*e, 48000);
}
double rmsOf(const std::vector<float>& x, std::size_t from = 0) {
  double s = 0;
  for (std::size_t i = from; i < x.size(); ++i)
    s += double(x[i]) * x[i];
  return std::sqrt(s / double(x.size() - from));
}
}  // namespace

TEST_CASE(
    "Review 2026-11-06: AutoWah, Chomp, Chopper, PitchShifter and Convolver change the sound") {
  const auto dry = renderTone(BlockType::FxVolume, false);
  for (const BlockType fx : {BlockType::FxAutoWah, BlockType::FxChomp, BlockType::FxChopper,
                             BlockType::FxPitchShifter, BlockType::FxConvolver}) {
    INFO("block type " << int(fx));
    const auto wet = renderTone(fx, true);
    std::vector<float> diff(wet.size());
    for (std::size_t i = 0; i < wet.size(); ++i)
      diff[i] = wet[i] - dry[i];
    CHECK(std::all_of(wet.begin(), wet.end(), [](float v) { return std::isfinite(v); }));
    CHECK(rmsOf(wet, 4800) > 1e-3);                     // still sounds
    CHECK(rmsOf(diff, 4800) > 0.1 * rmsOf(dry, 4800));  // and is not the dry signal
  }
}

TEST_CASE(
    "Convolver: the partitioned FFT convolution equals direct convolution (head, tail and their "
    "seams)") {
  // A 5000-tap response covers the direct taps, all head partitions and five tail partitions.
  const int taps = 5000, frames = 9000;
  std::vector<float> ir(taps), x(frames);
  Pcg32 rng(7);
  for (auto& v : ir)
    v = rng.nextFloat() * 2 - 1;
  for (auto& v : x)
    v = rng.nextFloat() * 2 - 1;
  dsp::ConvolutionKernel k;
  k.reserve(taps);
  k.build(ir.data(), nullptr, taps, 48000, 48000);
  // Chromium's normalisation scale, as build() applies it.
  double p = 0;
  for (float v : ir)
    p += double(v) * v;
  const double scale =
      1.0 / std::sqrt(p / taps) * std::pow(10.0, -58.0 * 0.05) * (44100.0 / 48000.0);
  dsp::Convolver c;
  c.reserve(k.maxTailParts());
  std::vector<float> l = x, r = x;
  for (int done = 0; done < frames; done += 100)
    c.process(k, l.data() + done, r.data() + done, std::min(100, frames - done), 0.0, 1.0);
  double worst = 0, peak = 0;
  for (int n = 0; n < frames; ++n) {
    double y = 0;
    for (int j = 0; j < taps && j <= n; ++j)
      y += double(ir[j]) * x[n - j];
    y *= scale;
    peak = std::max(peak, std::abs(y));
    worst = std::max({worst, std::abs(y - l[n]), std::abs(y - r[n])});
  }
  CHECK(worst < 1e-4 * peak);
}

TEST_CASE(
    "Review 2026-11-06: holding the pointer on a source powers it; release stops it (v1 "
    "Source.MouseDown)") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::SourceTone, 0, 0));
  e->push(Command::press(1, true, 4800));
  e->push(Command::press(1, false, 24000));
  const auto out = render(*e, 72000);
  const std::vector<float> before(out.begin(), out.begin() + 4800),
      held(out.begin() + 9600, out.begin() + 24000), after(out.begin() + 60000, out.end());
  CHECK(rmsOf(before) == 0.0);
  CHECK(rmsOf(held) > 1e-2);
  CHECK(rmsOf(after) < 1e-4);
}

TEST_CASE(
    "Review 2026-11-06: an unpowered emitter fires nothing; pressed, it fires at once and keeps "
    "firing") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerEmitter, 0, 0));
  render(*e, 48000);
  CHECK(e->particles().empty());
  e->push(Command::press(1, true));
  render(*e, 480);  // a few ticks: v1 primes the counter while unpowered, so the first particle
                    // leaves immediately
  CHECK(!e->particles().empty());
  e->push(Command::press(1, false));
  render(*e,
         48000 * 4);  // particles live range/speed = 200 v1 frames; none are emitted after release
  CHECK(e->particles().empty());
}

TEST_CASE(
    "Review 2026-11-06: pressing an effect or a Power block does nothing (only v1 Source "
    "subclasses)") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::FxFilter, 0, 0));
  e->push(Command::add(2, BlockType::PowerPower, 10, 0));
  e->push(Command::press(1, true));
  e->push(Command::press(2, true));
  render(*e, 480);
  CHECK(e->block(1)->power() == 0);
  CHECK(e->block(2)->power() == 0);
}

TEST_CASE(
    "Review 2026-11-07: toggling a sampler's reverse restarts its sounding voices (v1 SwitchBuffer "
    "→ RetriggerActiveVoices)") {
  // 1 s of 441 Hz at 48 kHz, no loop. Reverse at 0.8 s: v1 restarts the voice at the region start,
  // so it sounds for a further 1 s; carrying on from 0.8 s would stop after 0.2 s.
  std::vector<float> buf(48000);
  for (std::size_t i = 0; i < buf.size(); ++i)
    buf[i] = static_cast<float>(
        std::sin(2 * 3.141592653589793 * 441.0 * static_cast<double>(i) / 48000.0));
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::SourceSample, 0, 0));
  e->push(Command::setParam(1, P::SourceSample::loop, 0));
  render(*e, 128);
  CHECK(e->attachSample(
      1, SampleBuffer{buf.data(), nullptr, static_cast<std::uint32_t>(buf.size()), 48000.0}));
  e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  render(*e, 38400);  // to 0.8 s
  e->push(Command::setParam(1, P::SourceSample::reverse, 1));
  const auto out = render(*e, 48000);                                        // 0.8 s → 1.8 s
  const std::vector<float> later(out.begin() + 19200, out.begin() + 28800);  // 1.2–1.4 s
  CHECK(rmsOf(later) > 0.01);  // still sounding (restarted)
}
