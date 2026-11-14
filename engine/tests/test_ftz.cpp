// Output must not depend on the FPU's flush-to-zero mode: DAWs and JUCE (ScopedNoDenormals) enable it on the audio
// thread, the CLI/WASM do not. Golden hashes are only portable if no denormals ever occur.
#include <catch2/catch_test_macros.hpp>

#include <cstdint>
#include <fstream>

#include "helpers.hpp"
#if defined(__x86_64__) || defined(_M_X64)
#include <immintrin.h>
#endif

using namespace bdtest;

namespace {
struct FlushToZero {
#if defined(__aarch64__)
  std::uint64_t saved = 0;
  FlushToZero() { asm volatile("mrs %0, fpcr" : "=r"(saved)); const std::uint64_t v = saved | (1ULL << 24); asm volatile("msr fpcr, %0" : : "r"(v)); }
  ~FlushToZero() { asm volatile("msr fpcr, %0" : : "r"(saved)); }
#elif defined(__x86_64__) || defined(_M_X64)
  unsigned saved = _mm_getcsr();
  FlushToZero() { _mm_setcsr(saved | 0x8040); }  // FTZ | DAZ
  ~FlushToZero() { _mm_setcsr(saved); }
#endif
};

std::uint64_t renderFilteredRingout(bool ftz) {
  auto e = makeEngine();
  // A boosted filter on a tone that is pulsed and then left to decay for a long time: filter state rings down
  // towards zero, which is exactly where denormals would appear.
  e->push(Command::add(1, BlockType::PowerEmitter, -10, 0));
  e->push(Command::setParam(1, P::PowerEmitter::angle, 0));
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 1));
  // default rate fires at tick 319; switch the emitter off right after so exactly one particle hits the tone
  e->push(Command::setParam(1, P::PowerEmitter::selfPoweredMode, 0, 320 * 200));
  e->push(Command::add(2, BlockType::SourceTone, 0, -0.5));
  e->push(Command::add(3, BlockType::FxFilter, 3, 0));
  e->push(Command::setParam(3, P::FxFilter::gain, 30));
  e->push(Command::setParam(3, P::FxFilter::frequency, 40));
  std::vector<float> out;
  if (ftz) { FlushToZero guard; out = render(*e, 48000 * 30); }
  else out = render(*e, 48000 * 30);
  REQUIRE(eventsOf(*e, Event::Type::GateOn).size() == 1);  // the filter really received a note, then rang down
  return hashAudio(out);
}
}  // namespace

TEST_CASE("output is bit-identical with flush-to-zero on and off") {
  CHECK(renderFilteredRingout(false) == renderFilteredRingout(true));
}
