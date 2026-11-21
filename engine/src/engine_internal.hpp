// Private to the engine's own files (engine*.cpp): helpers they share. Not part of the engine's interface.
#pragma once

#include <algorithm>
#include <cmath>
#include <limits>

#include "blokdust/dmath.hpp"
#include "blokdust/engine.hpp"
#include "blokdust/geometry.hpp"

namespace blokdust {

namespace P = gen::param;

namespace {
[[maybe_unused]] inline bool isSampler(BlockType t) noexcept { return t == BlockType::SourceSample || t == BlockType::SourceRecorder || t == BlockType::SourceSampleGen; }
/// Oscillator sources: the Tone and the Wavetable (CHG-0031) share Note and Fine, pitch and expression rules.
[[maybe_unused]] inline bool isOscillator(BlockType t) noexcept { return t == BlockType::SourceTone || t == BlockType::SourceWavetable; }
[[maybe_unused]] constexpr double kBaseNoteHz = 261.6;  // v1 Config.BaseNote
[[maybe_unused]] constexpr double kDegToRad = 3.14159265358979323846 / 180.0;
}  // namespace

}  // namespace blokdust
