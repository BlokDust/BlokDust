// CHG-0031: the Wavetable source block and its built-in tables (SPEC-AUDIO-WAVETABLE, AUDIO-0004).
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <cstring>
#include <vector>

#include "blokdust/tablebank.hpp"
#include "helpers.hpp"

using namespace bdtest;
using dsp::TableBank;
using dsp::TableOscillator;

namespace {
constexpr int kSr = 48000;
constexpr double kPi = 3.141592653589793;

/// Goertzel magnitude of `hz` over v[from, from + n).
double magnitudeAt(const std::vector<float>& v, std::size_t from, std::size_t n, double hz, int sr = kSr) {
  const double w = 2.0 * kPi * hz / sr, c = 2.0 * std::cos(w);
  double s1 = 0, s2 = 0;
  for (std::size_t i = 0; i < n; ++i) {
    const double win = 0.5 - 0.5 * std::cos(2.0 * kPi * double(i) / double(n - 1));  // Hann
    const double s0 = v[from + i] * win + c * s1 - s2;
    s2 = s1; s1 = s0;
  }
  return std::sqrt(std::max(0.0, s1 * s1 + s2 * s2 - c * s1 * s2)) / double(n);
}
double dB(double a, double ref) { return 20.0 * std::log10(std::max(a, 1e-12) / ref); }

/// One powered source at A4 (440 Hz: Note +9 from v1's base C 261.6 Hz is not exact, so a MIDI note plays it).
std::vector<float> playA4(BlockType type, std::initializer_list<std::pair<std::uint8_t, double>> params, double seconds = 1.0) {
  auto e = makeEngine(kSr, 1, false);
  e->push(Command::add(1, BlockType::InputMidiController, 0, 0));
  e->push(Command::add(2, type, 3, 0));
  for (auto [k, v] : params) e->push(Command::setParam(2, k, v));
  e->push(Command::noteOn(BlockType::InputMidiController, 69, 1.0, 480));
  return render(*e, static_cast<std::int64_t>(seconds * kSr));
}

std::vector<float> oscillate(const TableBank& bank, int table, double position, double hz, int n) {
  TableOscillator o;
  o.setTable(table);
  o.setPosition(position, true);
  o.setFrequency(hz, bank, kSr);
  std::vector<float> out(static_cast<std::size_t>(n));
  for (auto& x : out) x = static_cast<float>(o.next());
  return out;
}
}  // namespace

TEST_CASE("SPEC-AUDIO-WAVETABLE R1: the tables are built the same every time, and every frame peaks at 1") {
  const TableBank a(kSr), b(kSr);
  for (int t = 0; t < TableBank::kTables; ++t)
    for (double p : {0.0, 0.37, 1.0}) {
      const auto ra = a.read(t, p, {0, 0.0}), rb = b.read(t, p, {0, 0.0});
      REQUIRE(ra.lenA == rb.lenA);
      CHECK(std::memcmp(ra.a0, rb.a0, ra.lenA * sizeof(float)) == 0);
      float peak = 0.0f;
      double mean = 0.0;
      for (unsigned i = 0; i < ra.lenA; ++i) { peak = std::max(peak, std::abs(ra.a0[i])); mean += ra.a0[i]; }
      CHECK(std::abs(peak - 1.0f) < 1e-4f);
      CHECK(std::abs(mean / ra.lenA) < 1e-6);  // no DC
    }
  // The bank does not depend on the sample rate except for which band a pitch reads (fixed 512-harmonic frames).
  const TableBank hi(192000);
  CHECK(std::memcmp(a.read(3, 0.5, {2, 0.0}).a0, hi.read(3, 0.5, {2, 0.0}).a0, a.read(3, 0.5, {2, 0.0}).lenA * sizeof(float)) == 0);
}

TEST_CASE("SPEC-AUDIO-WAVETABLE R2: the bands read for a pitch never hold a harmonic above Nyquist") {
  for (int sr : {44100, 48000, 96000, 192000}) {
    const TableBank bank(sr);
    for (double hz = 0.5; hz < sr / 2.0; hz *= 1.03) {
      const auto bd = bank.bands(hz);
      const int top = TableBank::kMaxPartials >> bd.k, partner = TableBank::kMaxPartials >> std::min(bd.k + 1, TableBank::kBands - 1);
      if (bd.k < TableBank::kBands - 1) { CHECK(top * hz <= sr / 2.0 * (1 + 1e-9)); }
      if (bd.mix > 0.0) { CHECK(partner * hz <= sr / 2.0 * (1 + 1e-9)); }
    }
  }
}

TEST_CASE("SPEC-AUDIO-WAVETABLE R2: a glide across the bands is smooth (no step where one band hands over)") {
  const TableBank bank(kSr);
  TableOscillator o;
  o.setTable(6);  // SYNC at its brightest: the most harmonics to lose
  o.setPosition(1.0, true);
  double prev = 0.0, worst = 0.0;
  // Compare against a sawtooth's own largest step at the top pitch: a band switch would add a jump on top.
  for (int i = 0; i < kSr * 2; ++i) {
    const double hz = 100.0 * std::exp2(5.0 * i / (kSr * 2.0));
    o.setFrequency(hz, bank, kSr);
    const double x = o.next();
    if (i > 0) worst = std::max(worst, std::abs(x - prev));
    prev = x;
  }
  CHECK(worst < 1.2);  // a band-limited saw's reset at 3.2 kHz steps about 0.8–1; a doubled step would be ≥ 1.6
}

TEST_CASE("SPEC-AUDIO-WAVETABLE R3: SYNC at 0 is the Tone's saw and PULSE at 0 its square (reference oscillators)") {
  const auto saw = playA4(BlockType::SourceTone, {{P::SourceTone::waveform, 3}});
  const auto sq = playA4(BlockType::SourceTone, {{P::SourceTone::waveform, 1}});
  const auto wsaw = playA4(BlockType::SourceWavetable, {{P::SourceWavetable::table, 6}, {P::SourceWavetable::position, 0}});
  const auto wsq = playA4(BlockType::SourceWavetable, {{P::SourceWavetable::table, 8}, {P::SourceWavetable::position, 0}});
  const std::size_t from = kSr / 4, n = kSr / 2;
  for (int h = 1; h <= 9; ++h) {
    const double ref = magnitudeAt(saw, from, n, 440.0), got = magnitudeAt(wsaw, from, n, 440.0);
    CHECK(std::abs(dB(magnitudeAt(wsaw, from, n, 440.0 * h), got) - dB(magnitudeAt(saw, from, n, 440.0 * h), ref)) < 1.0);
    if (h % 2) {
      const double r2 = magnitudeAt(sq, from, n, 440.0), g2 = magnitudeAt(wsq, from, n, 440.0);
      CHECK(std::abs(dB(magnitudeAt(wsq, from, n, 440.0 * h), g2) - dB(magnitudeAt(sq, from, n, 440.0 * h), r2)) < 1.0);
    }
  }
  // Same level as the Tone (both peak-normalised): within 1.5 dB RMS.
  CHECK(std::abs(dB(rms(wsaw, from, from + n), rms(saw, from, from + n))) < 1.5);
}

TEST_CASE("SPEC-AUDIO-WAVETABLE R4: inharmonic tables play the note: the bell's prime and tierce, the chime's modes") {
  const auto bell = playA4(BlockType::SourceWavetable, {{P::SourceWavetable::table, 0}});
  const std::size_t from = kSr / 4, n = kSr / 2;
  const double prime = magnitudeAt(bell, from, n, 440.0), tierce = magnitudeAt(bell, from, n, 440.0 * 1.2);
  const double between = magnitudeAt(bell, from, n, 440.0 * 1.1);
  CHECK(dB(prime, between) > 20.0);
  CHECK(dB(tierce, between) > 20.0);
  const auto chime = playA4(BlockType::SourceWavetable, {{P::SourceWavetable::table, 1}, {P::SourceWavetable::position, 1}});
  CHECK(dB(magnitudeAt(chime, from, n, 440.0 * 2.75), magnitudeAt(chime, from, n, 440.0 * 2.0)) > 20.0);  // not harmonic
  // Note and Fine move it as they move the Tone: +12 doubles the prime.
  const auto up = playA4(BlockType::SourceWavetable, {{P::SourceWavetable::table, 0}, {P::SourceWavetable::transpose, 12}});
  CHECK(dB(magnitudeAt(up, from, n, 880.0), magnitudeAt(up, from, n, 440.0 * 1.1 * 2)) > 20.0);
}

TEST_CASE("SPEC-AUDIO-WAVETABLE R5: Position changes the sound and a jump in it glides (no click)") {
  const TableBank bank(kSr);
  for (int t = 0; t < TableBank::kTables; ++t) {
    const auto a = oscillate(bank, t, 0.0, 220.0, 4096), b = oscillate(bank, t, 1.0, 220.0, 4096);
    double diff = 0;
    for (std::size_t i = 0; i < a.size(); ++i) diff += std::abs(a[i] - b[i]);
    CHECK(diff / a.size() > 0.05);
  }
  // A jump from 0 to 1 on a held note: the largest sample step stays near the steady wave's own.
  auto steadyStep = [](const std::vector<float>& v, std::size_t from, std::size_t to) {
    double w = 0; for (std::size_t i = from + 1; i < to; ++i) w = std::max(w, double(std::abs(v[i] - v[i - 1]))); return w; };
  auto e = makeEngine(kSr, 1, false);
  e->push(Command::add(1, BlockType::PowerPower, -3, 0));
  e->push(Command::add(2, BlockType::SourceWavetable, 0, 0));
  e->push(Command::setParam(2, P::SourceWavetable::table, 4));
  e->push(Command::setParam(2, P::SourceWavetable::position, 1.0, kSr / 2));
  const auto out = render(*e, kSr);
  const double before = steadyStep(out, kSr / 4, kSr / 2 - 64), during = steadyStep(out, kSr / 2 - 64, kSr / 2 + 2400),
               after = steadyStep(out, kSr / 2 + 4800, kSr);
  CHECK(during < 1.5 * std::max(before, after));
}

TEST_CASE("SPEC-AUDIO-WAVETABLE R6: output does not depend on how the host cuts the buffer") {
  auto make = [] {
    auto e = makeEngine(kSr, 5, true);
    e->push(Command::add(1, BlockType::PowerPower, -3, 0));
    e->push(Command::add(2, BlockType::SourceWavetable, 0, 0));
    e->push(Command::setParam(2, P::SourceWavetable::table, 2));
    e->push(Command::setParam(2, P::SourceWavetable::position, 0.3));
    e->push(Command::setParam(2, P::SourceWavetable::position, 0.9, 20000));
    e->push(Command::add(3, BlockType::FxVibrato, 3, 0));
    return e;
  };
  auto a = make(), b = make();
  CHECK(hashAudio(render(*a, kSr, 128)) == hashAudio(render(*b, kSr, 37)));
}

TEST_CASE("SPEC-AUDIO-WAVETABLE R7: the panel's picture is the frame the engine reads at the lowest band") {
  const TableBank bank(kSr);
  const auto pic = TableBank::picture(5, 0.5, 2048, 1.0);
  const auto r = bank.read(5, 0.5, {0, 0.0});
  REQUIRE(r.lenA == 2048);
  double worst = 0;
  for (int i = 0; i < 2048; ++i) {
    const double at = double(i) / 2047.0 * 2047.0;  // picture spans 0 … len − 1
    const double v = r.a0[i] + r.frameMix * (r.a1[i] - r.a0[i]);
    worst = std::max(worst, std::abs(pic[static_cast<std::size_t>(i)] - v));
    (void)at;
  }
  CHECK(worst < 1e-4);
  CHECK(TableBank::names().size() == static_cast<std::size_t>(gen::info(BlockType::SourceWavetable).params[P::SourceWavetable::table].uiMax) + 1);
}
