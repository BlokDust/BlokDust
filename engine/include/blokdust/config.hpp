#pragma once
// Engine-wide constants. See docs/specs/domains/simulation/power-and-particles.md.
#include <cstdint>

namespace blokdust {

using BlockId = std::uint32_t;
inline constexpr BlockId kInvalidBlock = 0;

inline constexpr int kTickRate = 240;           // simulation ticks per second (SIMULATION-0001)
inline constexpr int kV1FrameRate = 60;         // v1 per-frame quantities are converted at this reference (SIMULATION-0003)
inline constexpr int kTicksPerV1Frame = kTickRate / kV1FrameRate;
inline constexpr double kV1UnitsPerGrid = 15.0; // v1 drawing units per grid cell
inline constexpr double kPulseSeconds = 0.15;   // v1 Config.PulseLength
inline constexpr int kPulseTicks = 36;          // kPulseSeconds * kTickRate
static_assert(kPulseTicks == static_cast<int>(kPulseSeconds * kTickRate + 0.5));

inline constexpr int kMaxBlocks = 512;
inline constexpr int kMaxParticles = 4096;
inline constexpr int kMaxPulsesPerBlock = 64;
inline constexpr int kCommandQueueCapacity = 1024;
inline constexpr int kEventLogCapacity = 1 << 16;
inline constexpr int kMaxSegment = 1024;
// Effect instances with long delay memory (pooled at construction; beyond these an effect is bypassed).
inline constexpr int kMaxReverbs = 32;
inline constexpr int kMaxDelays = 16;
inline constexpr double kMaxDelaySeconds = 1.0;  // a synced Stereo Delay's longest time (v1's own is ≤ 0.5 s)
inline constexpr int kMaxChoruses = 32;
inline constexpr int kMaxPitchShifters = 16;
// Lasers through Prisms (CHG-0015, SIMULATION-0006): a beam path passes through at most kMaxPrismDepth prisms, one
// laser casts at most kMaxBeamSegments beams, and kMaxBeams are kept for the UI per tick.
inline constexpr int kMaxPrismDepth = 8;
inline constexpr int kMaxBeamSegments = 64;
inline constexpr int kMaxBeams = 1024;
inline constexpr int kMaxStages = 8;           // source.stage blocks with an inner world attached (CHG-0021)
inline constexpr int kMaxListeners = 8;        // power.sound-laser: a listening buffer each (CHG-0016)
inline constexpr int kMaxCompressors = 16;     // fx.compressor: 6 ms look-ahead memory each (CHG-0014)
inline constexpr int kMaxConvolvers = 4;       // FFT convolution: memory and CPU heavy
inline constexpr double kMaxImpulseSeconds = 2.5;  // longer impulse responses are truncated        // max samples rendered between tick boundaries in one pass

// v1 levels, measured in v1 itself (CHG-0002 1.4, `bd v1 audio --eval`). Tone r6 converts dB with gain = 2^(dB/6).
// Master: Audio.MasterVolume says -10 dB, but MainScene.Begin's fade-in stops at -12 dB (2 dB steps from -30), applied
// after the master compressor (Tone.Master.chain inserts it before the volume stage): 2^(-12/6) = 0.25.
inline constexpr double kMasterGain = 0.25;
// Source: every source feeds its chain through Tone.Mono, whose input gain is -10 dB: 2^(-10/6). v1's
// Source.Settings.output.volume (0.5) is never applied.
inline constexpr double kSourceGain = 0.31498026247371826;

}  // namespace blokdust
