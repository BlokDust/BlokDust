// CHG-0002 1.3: the stereo audio graph (pre/post effects, pools), rewiring fades (SPEC-CONNECTIONS-PROXIMITY R5) and the
// v1 behaviours the parity work relies on (SPEC-AUDIO-V1-PARITY).
#include <algorithm>
#include <catch2/catch_test_macros.hpp>
#include <utility>

#include "helpers.hpp"

using namespace bdtest;

namespace {
struct Stereo { std::vector<float> l, r; };
Stereo renderStereo(Engine& e, std::int64_t frames, std::uint32_t block = 128) {
  Stereo s{std::vector<float>(static_cast<std::size_t>(frames)), std::vector<float>(static_cast<std::size_t>(frames))};
  for (std::int64_t done = 0; done < frames;) {
    const auto n = static_cast<std::uint32_t>(std::min<std::int64_t>(block, frames - done));
    e.process(s.l.data() + done, s.r.data() + done, n);
    done += n;
  }
  return s;
}
void sine(Engine& e, BlockId id, double x, double y, double transpose = 0) {
  e.push(Command::add(id, BlockType::SourceTone, x, y));
  e.push(Command::setParam(id, P::SourceTone::waveform, 0));
  e.push(Command::setParam(id, P::SourceTone::transpose, transpose));
}
}  // namespace

TEST_CASE("SPEC-CONNECTIONS-PROXIMITY R5: rewiring one chain leaves every other chain bit-identical") {
  // Chain A (Power + sine) is far from chain B (Power + sine an octave up); a Filter moves into B at 0.5 s.
  // With the compressor off the mix is a plain sum, so A's contribution must be exactly what A renders alone.
  auto scene = [](bool withA, bool withB) {
    auto e = makeEngine(48000, 1, false);
    if (withA) { sine(*e, 1, 0, 0); e->push(Command::add(2, BlockType::PowerPower, -3, 0)); }
    if (withB) {
      sine(*e, 3, 40, 0, 12); e->push(Command::add(4, BlockType::PowerPower, 37, 0));
      e->push(Command::add(5, BlockType::FxFilter, 80, 0));
      e->push(Command::setParam(5, P::FxFilter::gain, 15));
      e->push(Command::move(5, 43, 0, 24000));
    }
    return render(*e, 48000);
  };
  const auto both = scene(true, true), a = scene(true, false), b = scene(false, true);
  double worst = 0;
  for (std::size_t i = 0; i < both.size(); ++i) worst = std::max(worst, std::abs(double(both[i]) - (double(a[i]) + b[i])));
  CHECK(worst < 1e-6);
}

TEST_CASE("SPEC-CONNECTIONS-PROXIMITY R5: a chain that rewires fades (no click) and settles within 10 ms") {
  auto e = makeEngine(48000, 1, false);
  sine(*e, 1, 0, 0);
  e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  e->push(Command::add(3, BlockType::FxVolume, 30, 0));
  e->push(Command::setParam(3, P::FxVolume::gain, -18));  // joining the chain drops the level ~9 dB (Tone dB: 2^(dB/6))
  e->push(Command::move(3, 3, 0, 36000));  // after the default envelope's decay (0.51 s): steady level
  const auto out = render(*e, 60000);
  // A hard switch would jump by ~0.65 × the sine's amplitude in one sample; the fade keeps every step near the
  // sine's own maximum slope (2π·261.6/48000 ≈ 0.034 × amplitude).
  double amp = 0, maxStep = 0;
  for (std::size_t i = 28000; i < 36000; ++i) amp = std::max(amp, double(std::abs(out[i])));
  for (std::size_t i = 35000; i < 38000; ++i) maxStep = std::max(maxStep, std::abs(double(out[i]) - out[i - 1]));
  CHECK(maxStep < 0.06 * amp);
  // After 10 ms (5 out + 5 in, plus up to one tick of latency) the new routing is fully in: level ≈ 2^(−18/6).
  const double before = rms(out, 28000, 36000), after = rms(out, 36000 + 720, 60000);
  CHECK(std::abs(20 * std::log10(after / before) - 20 * std::log10(0.125)) < 0.2);
}

TEST_CASE("v1 Envelope rule: Power-held sources keep the default ADSR, particle hits use the chain's Envelope") {
  auto level = [](bool viaParticles, bool withEnvelope) {
    auto e = makeEngine(48000, 1, false);
    sine(*e, 1, 0, 0);
    if (viaParticles) {
      e->push(Command::add(2, BlockType::PowerEmitter, -8, 0));
      e->push(Command::setParam(2, P::PowerEmitter::selfPoweredMode, 1));
      e->push(Command::setParam(2, P::PowerEmitter::angle, 0));  // towards the tone
    } else {
      e->push(Command::add(2, BlockType::PowerPower, -3, 0));
    }
    if (withEnvelope) {
      e->push(Command::add(3, BlockType::FxEnvelope, 3, 0));
      e->push(Command::setParam(3, P::FxEnvelope::attack, 2.0));  // 2 s attack: pulses barely open
    }
    return rms(render(*e, 96000), 0, 96000);
  };
  CHECK(std::abs(20 * std::log10(level(false, true) / level(false, false))) < 0.01);  // Power: Envelope ignored
  CHECK(level(true, true) < 0.3 * level(true, false));                               // particles: Envelope applies
}

TEST_CASE("v1 Reverb: creation-time params are swapped (Tone.Freeverb argument order), later slider moves are not") {
  auto run = [](bool slidersLater) {
    auto e = makeEngine(48000, 1, false);
    sine(*e, 1, 0, 0);  // first: the queue is FIFO, so commands after a timed one wait for it
    e->push(Command::add(3, BlockType::FxReverb, 3, 0));
    if (slidersLater) {  // move both sliders after creation to the values the swap produces
      e->push(Command::setParam(3, P::FxReverb::roomSize, 0.7, 2400));
      e->push(Command::setParam(3, P::FxReverb::dampening, 0.5, 2400));
    } else {  // loaded with dampening 0.7 / roomSize 0.5 (v1 defaults) → runs as roomSize 0.7 / dampening 0.5
      e->push(Command::setParam(3, P::FxReverb::dampening, 0.7));
      e->push(Command::setParam(3, P::FxReverb::roomSize, 0.5));
    }
    e->push(Command::add(2, BlockType::PowerPower, -3, 0, 4800));
    return render(*e, 48000);
  };
  CHECK(hashAudio(run(false)) == hashAudio(run(true)));
}

TEST_CASE("stereo graph: ping-pong delay and chorus make left and right differ; mono chains stay identical") {
  for (const auto fx : {BlockType::FxStereoDelay, BlockType::FxChorus, BlockType::FxFilter}) {
    auto e = makeEngine();
    sine(*e, 1, 0, 0);
    e->push(Command::add(2, BlockType::PowerPower, -3, 0));
    e->push(Command::add(3, fx, 3, 0));
    const auto s = renderStereo(*e, 48000);
    const bool differs = !std::equal(s.l.begin(), s.l.end(), s.r.begin());
    CHECK(differs == (fx != BlockType::FxFilter));
  }
}

TEST_CASE("effect pools: more delay-memory effects than the pool holds are bypassed safely") {
  auto e = makeEngine();
  sine(*e, 1, 0, 0);
  e->push(Command::add(2, BlockType::PowerPower, -3, 0));
  for (int i = 0; i < kMaxDelays + kMaxReverbs + kMaxChoruses + 6; ++i) {
    const auto t = i % 3 == 0 ? BlockType::FxStereoDelay : i % 3 == 1 ? BlockType::FxReverb : BlockType::FxChorus;
    e->push(Command::add(static_cast<BlockId>(10 + i), t, 3 + (i % 2), (i / 2) * 0.01));
  }
  const auto out = render(*e, 24000);
  CHECK(rms(out) > 0.0);
  for (int i = 0; i < 20; ++i) e->push(Command::remove(static_cast<BlockId>(10 + i)));  // released instances are reusable
  for (int i = 0; i < 20; ++i) e->push(Command::add(static_cast<BlockId>(500 + i), BlockType::FxStereoDelay, 3, 0.2 + i * 0.01));
  CHECK(rms(render(*e, 4800)) > 0.0);
}

TEST_CASE("source.sample (Tone.Simpler): plays the region, loops or stops, pitch by playbackRate, buffer rate honoured") {
  // 0.5 s of a 441 Hz sine at 44.1 kHz (a different rate from the engine's 48 kHz).
  std::vector<float> buf(22050);
  for (std::size_t i = 0; i < buf.size(); ++i) buf[i] = static_cast<float>(std::sin(2 * 3.141592653589793 * 441.0 * i / 44100.0));
  auto run = [&](bool loop, double semitones) {
    auto e = makeEngine(48000, 1, false);
    e->push(Command::add(1, BlockType::SourceSample, 0, 0));
    e->push(Command::setParam(1, P::SourceSample::loop, loop ? 1 : 0));
    e->push(Command::setParam(1, P::SourceSample::playbackRate, semitones));
    settle(*e);
    CHECK(e->attachSample(1, SampleBuffer{buf.data(), nullptr, static_cast<std::uint32_t>(buf.size()), 44100.0}));
    e->push(Command::add(2, BlockType::PowerPower, -3, 0));
    return render(*e, 48000);
  };
  auto crossings = [](const std::vector<float>& v, std::size_t a, std::size_t b) {
    int z = 0; for (std::size_t i = a + 1; i < b; ++i) z += (v[i - 1] < 0) != (v[i] < 0); return z;
  };
  const auto once = run(false, 0), looped = run(true, 0), up = run(true, 12);
  CHECK(rms(once, 4800, 19200) > 0.01);
  CHECK(rms(once, 30000, 48000) < 1e-6);                    // region (0.5 s) over, no loop: silent
  CHECK(rms(looped, 30000, 48000) > 0.01);                   // loops loopStart (0.25 s) → loopEnd (0.5 s)
  CHECK(std::abs(crossings(looped, 2400, 12000) - 2 * 441 * 0.2) <= 2);   // 441 Hz despite 44.1 → 48 kHz
  CHECK(std::abs(crossings(up, 2400, 12000) - 4 * 441 * 0.2) <= 3);       // +12 semitones: 882 Hz
}
