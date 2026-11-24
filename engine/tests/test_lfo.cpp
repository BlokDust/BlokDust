// CHG-0018 (AUDIO-0003): the LFO moves one param of one block connected to it.
#include <algorithm>
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <utility>
#include <vector>

#include "helpers.hpp"

using namespace bdtest;

namespace {
/// A Volume block (1) with an LFO (2) beside it aimed at its gain (slider −20…20), not synced, 1
/// Hz, depth 0.5.
std::unique_ptr<Engine> volumeAndLfo() {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::FxVolume, 0, 0));
  e->push(Command::add(2, BlockType::FxLfo, 3, 0));
  e->push(Command::setParam(2, P::FxLfo::targetBlock, 1));
  e->push(Command::setParam(2, P::FxLfo::targetParam, P::FxVolume::gain));
  return e;
}
double gain(const Engine& e) {
  return e.block(1)->params[P::FxVolume::gain];
}
/// The gain at each tick over `ticks` ticks.
std::vector<double> trace(Engine& e, int ticks) {
  std::vector<double> out;
  for (int i = 0; i < ticks; ++i) {
    render(e, 200);
    out.push_back(gain(e));
  }
  return out;
}
}  // namespace

TEST_CASE(
    "CHG-0018 LFO: a sine at 1 Hz, depth 0.5, swings a slider a quarter of its range each way "
    "round where it is set") {
  auto e = volumeAndLfo();
  const auto g = trace(*e, 240);  // one second = one cycle
  const auto [lo, hi] = std::minmax_element(g.begin(), g.end());
  CHECK(std::abs(*hi - 10.0) < 0.01);  // slider −20…20: ±(0.5 × half of 40)
  CHECK(std::abs(*lo + 10.0) < 0.01);
  CHECK(std::abs(g[59] - 10.0) < 0.1);                    // the peak a quarter of the way in
  CHECK(e->block(1)->modBase[P::FxVolume::gain] == 0.0);  // where it is set is untouched
  // Moving the slider moves the centre; the swing follows.
  e->push(Command::setParam(1, P::FxVolume::gain, 5));
  const auto g2 = trace(*e, 240);
  const auto [lo2, hi2] = std::minmax_element(g2.begin(), g2.end());
  CHECK(std::abs(*hi2 - 15.0) < 0.01);
  CHECK(std::abs(*lo2 + 5.0) < 0.01);
}

TEST_CASE("CHG-0018 LFO: the sum stops at the slider's ends; two LFOs on one param add") {
  auto e = volumeAndLfo();
  e->push(Command::setParam(2, P::FxLfo::depth, 1.0));
  e->push(Command::setParam(1, P::FxVolume::gain, 15));
  const auto g = trace(*e, 240);
  CHECK(*std::max_element(g.begin(), g.end()) == 20.0);  // clamped at the top
  CHECK(std::abs(*std::min_element(g.begin(), g.end()) + 5.0) < 0.01);
  // A second LFO, same shape and phase: twice the swing.
  auto two = volumeAndLfo();
  two->push(Command::add(3, BlockType::FxLfo, -3, 0));
  two->push(Command::setParam(3, P::FxLfo::targetBlock, 1));
  two->push(Command::setParam(3, P::FxLfo::targetParam, P::FxVolume::gain));
  two->push(Command::setParam(2, P::FxLfo::depth, 0.25));
  two->push(Command::setParam(3, P::FxLfo::depth, 0.25));
  const auto g2 = trace(*two, 240);
  CHECK(std::abs(*std::max_element(g2.begin(), g2.end()) - 10.0) <
        0.01);  // 0.25 + 0.25 = one LFO at 0.5
}

TEST_CASE("CHG-0018 LFO: shapes, phase and tempo sync") {
  auto sq = volumeAndLfo();
  sq->push(Command::setParam(2, P::FxLfo::shape, 1));
  const auto g = trace(*sq, 240);
  CHECK(g[10] == 10.0);
  CHECK(g[200] == -10.0);
  auto saw = volumeAndLfo();
  saw->push(Command::setParam(2, P::FxLfo::shape, 3));
  saw->push(Command::setParam(2, P::FxLfo::phase, 0.5));  // half way up: starts at the centre
  const auto s = trace(*saw, 3);
  CHECK(std::abs(s[0]) < 0.2);
  // Synced: one cycle every 2 beats at 120 BPM = 1 s; locked to the beat, so the tempo changes its
  // speed.
  auto sy = volumeAndLfo();
  sy->push(Command::setParam(2, P::FxLfo::sync, 1));
  sy->push(Command::setParam(2, P::FxLfo::division, 2));
  const auto a = trace(*sy, 240);
  CHECK(std::abs(a[60] - 10.0) < 0.05);
  auto fast = volumeAndLfo();
  fast->push(Command::setParam(2, P::FxLfo::sync, 1));
  fast->push(Command::setParam(2, P::FxLfo::division, 2));
  fast->push(Command::tempo(240));
  const auto b = trace(*fast, 240);
  CHECK(std::abs(b[30] - 10.0) < 0.05);
}

TEST_CASE(
    "CHG-0018 LFO: it idles unless its target is connected; a param it stops moving goes back to "
    "where it was set") {
  auto e = volumeAndLfo();
  trace(*e, 30);
  CHECK(gain(*e) != 0.0);
  e->push(Command::move(2, 40, 0));  // out of reach
  trace(*e, 5);
  CHECK(gain(*e) == 0.0);
  CHECK(e->block(1)->modMask == 0);
  e->push(Command::move(2, 3, 0));
  trace(*e, 30);
  CHECK(gain(*e) != 0.0);
  e->push(Command::remove(2));
  trace(*e, 5);
  CHECK(gain(*e) == 0.0);
}

TEST_CASE(
    "CHG-0018 LFO: it connects to any kind of block, moves angles round, and frequencies in "
    "octaves") {
  auto e = makeEngine(48000, 1, false);
  e->push(Command::add(1, BlockType::PowerLaser, 0, 0));
  e->push(Command::add(2, BlockType::FxLfo, 3, 0));
  e->push(Command::add(3, BlockType::PowerPrism, 3, 3));
  e->push(Command::add(4, BlockType::FxFilter, 0, 3));
  e->push(Command::add(5, BlockType::InputComputerKeyboard, 3, -3));
  e->push(Command::add(6, BlockType::PowerVoid, 6, 0));
  settle(*e);
  for (BlockId id : {1u, 3u, 4u, 5u, 6u})
    CHECK(e->connected(2, id));
  CHECK(e->chains().chainOf[static_cast<std::size_t>(e->slotOf(2))] <
        0);  // never in an audio chain
  // The Laser's Angle (slider −180…180 for angle −270…90): depth 1 from −90 goes all the way round.
  e->push(Command::setParam(2, P::FxLfo::targetBlock, 1));
  e->push(Command::setParam(2, P::FxLfo::targetParam, P::PowerLaser::angle));
  e->push(Command::setParam(2, P::FxLfo::depth, 1.0));
  std::vector<double> a;
  for (int i = 0; i < 240; ++i) {
    render(*e, 200);
    a.push_back(e->block(1)->params[P::PowerLaser::angle]);
  }
  CHECK(*std::min_element(a.begin(), a.end()) < -260.0);
  CHECK(*std::max_element(a.begin(), a.end()) > 80.0);
  // The Filter's frequency: ±a quarter of 20 Hz…20 kHz in octaves (about 2.5 octaves) round 440 Hz.
  auto f = makeEngine(48000, 1, false);
  f->push(Command::add(4, BlockType::FxFilter, 0, 0));
  f->push(Command::add(2, BlockType::FxLfo, 3, 0));
  f->push(Command::setParam(2, P::FxLfo::targetBlock, 4));
  f->push(Command::setParam(2, P::FxLfo::targetParam, P::FxFilter::frequency));
  double lo = 1e9, hi = 0;
  for (int i = 0; i < 240; ++i) {
    render(*f, 200);
    const double hzv = f->block(4)->params[P::FxFilter::frequency];
    lo = std::min(lo, hzv);
    hi = std::max(hi, hzv);
  }
  CHECK(std::abs(hi / 440.0 - 440.0 / lo) < 0.01);  // the same ratio up as down
  CHECK(std::abs(std::log2(hi / 440.0) - 0.25 * std::log2(1000.0)) < 0.01);
}

TEST_CASE(
    "CHG-0018 LFO: an LFO on a Tone's Note is heard, the same whatever the buffer size (R12)") {
  const auto run = [](std::uint32_t block) {
    auto e = makeEngine(48000, 1, false);
    e->push(Command::add(1, BlockType::SourceTone, 0, 0));
    e->push(Command::add(2, BlockType::PowerPower, -3, 0));
    e->push(Command::add(3, BlockType::FxLfo, 3, 0));
    e->push(Command::setParam(3, P::FxLfo::targetBlock, 1));
    e->push(Command::setParam(3, P::FxLfo::targetParam, P::SourceTone::fine));
    e->push(Command::setParam(3, P::FxLfo::rate, 5));
    const auto out = render(*e, 48000, block);
    return std::pair{hashAudio(out), rms(out)};
  };
  const auto a = run(128);
  CHECK(a.second > 0.01);
  CHECK(run(1024) == a);
  CHECK(run(37) == a);
  // and it is not what the Tone sounds like without the LFO
  auto plain = makeEngine(48000, 1, false);
  plain->push(Command::add(1, BlockType::SourceTone, 0, 0));
  plain->push(Command::add(2, BlockType::PowerPower, -3, 0));
  CHECK(hashAudio(render(*plain, 48000)) != a.first);
}
