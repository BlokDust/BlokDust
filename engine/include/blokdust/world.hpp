#pragma once
// The engine-owned patch state (ARCHITECTURE-0002): blocks, proximity graph, chains, particles.
// Fixed-capacity storage only: nothing here allocates after construction.
#include <array>
#include <bitset>
#include <cstdint>

#include "blokdust/config.hpp"
#include "blokdust/dsp.hpp"
#include "blokdust/effects.hpp"
#include "blokdust/generated/blocks.gen.hpp"
#include "blokdust/rng.hpp"
#include "blokdust/tablebank.hpp"

namespace blokdust {

using gen::BlockKind;
using gen::BlockType;

/// v1 Source voices (Source.GetVoice/RemoveVoice): voice 0 is created for every source; a polyphonic controller adds
/// v1 Config.PolyphonicVoices (8) more. Power and mono controllers share the source's mono voice.
inline constexpr int kVoices = 9;
struct Voice {
  bool active = false;          // in v1 ActiveVoices
  BlockId controller = 0;       // controller block id; 0 = power (v1 controller "power")
  int key = -1;                 // the key the controller played (−1: power's DefaultNote)
  std::uint64_t freedAt = 0;    // FIFO order of v1 FreeVoices (never used = 0, by index)
  std::uint64_t activeAt = 0;   // ActiveVoices order: the oldest is stolen
  dsp::Envelope env;
  dsp::Oscillator osc;
  dsp::TableOscillator tosc;    // source.wavetable (CHG-0031)
  dsp::NoiseGen noise;
  double playhead = 0.0;        // source.sample: buffer frames
  bool samplePlaying = false;
  double pitch = 0.0;           // tone: Hz; sample: playback rate (v1 SetPitch ramps either linearly)
  double offset = 0.0;          // semitones on top of the note (a Chord's intervals, an Arpeggiator's octaves; CHG-0017)
  double glideTo = 0.0, glideStep = 0.0;
  int glideLeft = 0;            // samples left in the glide (Tone linearRampToValue)
  // Per-note expression (PLUGIN-0004, MPE): the note's MIDI channel (0–15) and what its controller maps onto the voice.
  int channel = 0;
  double bend = 0.0;            // semitones
  double exprGain = 1.0;        // pressure → volume target: floor + (1 − floor) × pressure (1 without MPE pressure)
  double pressureFloor = 1.0;   // MPE note: 0.3 + 0.5 × velocity, its level before / without pressure (owner)
  double gainNow = 1.0;         // exprGain, glided (~5 ms) so pressure steps do not crackle
  double lpA = 1.0, lpY = 0.0;  // slide → brightness: one-pole low-pass coefficient (1 = open) and state (Tone)
  std::uint32_t trigTick = 0;   // tick the voice was (re)triggered: a slide in that tick sets a Sample's start
  double slide = -1.0;          // last slide (0–1; −1: none): Granular's grain position
};

struct Block {
  bool alive = false;
  BlockId id = kInvalidBlock;
  BlockType type{};
  double x = 0.0, y = 0.0;      // grid units
  std::uint64_t order = 0;      // creation order; draw/hit order is by this (v1 App.Blocks order)
  std::array<double, gen::kMaxParams> params{};

  // ---- runtime (power, sim) ----
  int staticPower = 0;          // connected Power blocks (+ Toggle while on)
  int pulsePower = 0;           // active particle/Pulse pulses
  std::array<std::uint32_t, kMaxPulsesPerBlock> pulseEndTick{};
  int laserPower = 0;           // lasers currently hitting this block (continuous power while hit)
  int notePower = 0;            // 1 while a connected controller holds a note on this source (display only)
  int pressPower = 0;           // 1 while the pointer holds this source (v1 Source.MouseDown → AddPower)
  int keyPower = 0;             // Emitter/Laser: 1 while a connected keyboard holds a key (owner review 2)
  std::array<std::uint8_t, 16> keysHeld{};  // ... the keys it holds, oldest first (the newest aims it)
  int keyCount = 0;
  bool keyPoly = false;         // ... pressed on a polyphonic keyboard: every held key repeats, not just the newest
  std::array<std::uint8_t, 16> keyPresses{};  // Emitter: keys pressed since the last tick, each fires once (CHG-0009)
  int keyPressCount = 0;
  int emitCounter = 0;          // emitter: ticks since last emission
  std::int64_t beatSlot = -1;   // synced emitter: the beat-grid slot it last saw (CHG-0004 3.5)
  double laserAngle0 = 0.0;     // synced laser: its Angle at beat 0 (the angle set by the user; owner review 2)
  bool powerOn = false;         // audio source: power (not notes) is holding a voice (v1 NoteOn("power"))
  std::uint32_t gapUntil = 0;   // a Power cut by a hit (gapOnHit) gives no power until this tick
  bool restrike = false;        // a particle hit it while only earlier hits' pulses held it: strike again (SIMULATION-0008)

  // ---- laser (power.laser) ----
  std::bitset<kMaxBlocks> laserHits;  // slots this laser hit on the last tick
  bool beamOn = false;
  // Gates in its beams' paths (CHG-0015): the ones reached on the last tick, and whether each let the beam through
  // (a Counter or Chance decides once, when a beam arrives, SIMULATION-0005).
  std::bitset<kMaxBlocks> gateHits, gateOpen;
  // ---- modulation (CHG-0018, AUDIO-0003): params an LFO is moving (a bit each) and the values they are set to ----
  std::uint32_t modMask = 0;
  std::array<double, gen::kMaxParams> modBase{};
  double lfoPhase = 0.0;            // fx.lfo, not synced: its place in the cycle (0–1)
  // ---- power.sound-laser (CHG-0016): the level it hears (linear, peak with a 50 ms fall) and its gate ----
  double listenEnv = 0.0;
  std::uint32_t holdUntil = 0;
  bool listenOn = false;
  // ---- power.counter: the step the next hit lands on; whether the last one passed (monitor) ----
  int gateStep = 0;
  bool gatePassed = false;
  double beamLength = 0.0;      // grid units, after Void truncation

  // ---- audio sources: voices (v1 Source voices; see Voice) ----
  std::array<Voice, kVoices> voices{};
  int voiceCount = 1;           // 1, or kVoices while a polyphonic controller is connected (v1 CreateVoices)
  int monoVoice = -1;           // v1 MonoVoice
  int lastMonoVoice = -1;       // the mono voice last used: a key pressed soon after it ended glides from it
  std::int64_t lastMonoOff = -1;  // sample its last key was let go
  /// Mono: the keys held, oldest first; letting go of the sounding key returns to the newest one left (owner review 3).
  struct HeldKey { std::int16_t key; std::int16_t channel; BlockId controller; };
  std::array<HeldKey, 16> monoHeld{};
  int monoHeldCount = 0;
  std::uint64_t voiceClock = 0;
  // ---- arranged sources (CHG-0017, AUDIO-0002): a source with a note effect in its chain, or a keyboard with Keys
  // set pitch connected, takes its notes from here instead of v1's voice rules. Keys held by its controllers, oldest
  // first; the note Random Note picked for the current trigger; where its Arpeggiator is. ----
  struct ArrKey { std::int16_t key; std::int16_t channel; BlockId controller; bool pitchOnly; bool poly; double bend = 0.0; };  // bend: a slide (semitones)
  struct ArrNote { BlockId controller = 0; std::int16_t key = -1; std::int16_t channel = 0; double offset = 0.0; double bend = 0.0; };
  bool arranged = false;
  bool arrGate = false;             // sounding (power or a sounding key) at the last arrange
  std::array<ArrKey, 16> arrKeys{};
  int arrKeyCount = 0;
  ArrNote randomNote{};
  bool randomValid = false;
  int arpStep = -1;                 // which of its notes the Arpeggiator is on (−1: none yet)
  std::uint32_t arpRand = 0;        // its pick for the random pattern
  int arpTicks = 0;                 // not synced: ticks since the last step
  std::int64_t arpSlot = 0;         // synced: the beat-grid slot of the last step
  // source.sample (Tone.Simpler): decoded audio, playing until the region ends
  const float* sampleL = nullptr;
  const float* sampleR = nullptr;
  std::uint32_t sampleFrames = 0;
  // source.granular (v1 Granular, CHG-0004 3.8): up to 12 grains (v1 GrainsAmount), a spawn timer, and a random
  // stream of its own (seeded by block id: grain positions repeat exactly, and the patch seed stays visual-only).
  struct Grain { bool on = false; double pos = 0.0, rate = 1.0; int age = 0, len = 0; };
  std::array<Grain, 12> grains{};
  int grainTimer = 0, grainIndex = 0;
  Pcg32 grainRng{};
  double sampleRate = 48000.0;
  dsp::BiquadChainFx<1> filter;   // fx.filter (Tone.Filter, rolloff −12)
  float filterLevel = 1.0f;       // fx.filter Band pass level (CHG-0010); 1 for the other types
  dsp::BiquadChainFx<4> eq;       // fx.eq (Tone.EQMultiband)
  dsp::VolumeFx volume;
  dsp::DistortionFx distortion;
  dsp::BitCrusherFx crusher;
  dsp::PhaserFx phaser;
  dsp::ChorusFx chorus;           // delay memory from the engine's chorus pool
  dsp::FreeverbFx reverb;         // ... reverb pool
  dsp::PingPongFx pingpong;       // ... delay pool
  dsp::AutoWahFx autowah;
  dsp::ChompFx chomp;
  dsp::ChopperFx chopper;
  dsp::PitchShiftFx pitchshift;   // ... pitch-shifter pool
  bool userImpulse = false;       // fx.convolver: a loaded impulse response (else the built-in one)
  /// Live readouts for the block's open panel (Engine::monitors): what each holds depends on the type. Visual only.
  std::array<float, 4> mon{};
  dsp::Lfo lfo;                   // fx.vibrato / fx.scuzz: detune in cents (Tone.LFO → oscillator.detune)
  std::int16_t poolIndex = -1;    // instance in the engine pool for this type (−1: none, or pool exhausted → bypass)
  std::int64_t addedAt = 0;       // sample of the AddBlock: SetParam at that sample is load-time initialisation
  std::uint8_t lastParam = 255;   // param changed by the latest SetParam (255: none / creation)
  bool dspConfigured = false;     // first configureDsp sets LFO phase/delay state; later ones only update params
  bool envFromChain = false;      // this gate-on uses the chain's Envelope block (non-Power trigger, v1 rule)

  const gen::BlockInfo& info() const noexcept { return gen::info(type); }
  BlockKind kind() const noexcept { return info().kind; }
  int power() const noexcept { return staticPower + pulsePower + laserPower + notePower + pressPower + keyPower; }
  /// Power that holds the source's power voice (everything but controller notes).
  int sourcePower() const noexcept { return staticPower + pulsePower + laserPower + pressPower; }
  /// Any voice sounding (envelope not idle or gate held).
  bool gated() const noexcept { for (const auto& v : voices) if (v.active) return true; return false; }
};

struct Particle {
  double x, y;          // grid units
  double vx, vy;        // grid units per tick
  int life;             // ticks remaining
  float size;           // visual only (v1: 2 + rand)
  bool fresh;           // not yet moved: it was born where it is (R5b: an emitter catches only particles that enter it)
};

/// Is `kind` on the source side of a proximity connection?
constexpr bool isSourceSide(BlockKind k) noexcept { return k == BlockKind::AudioSource || k == BlockKind::PowerSource; }
/// Is `kind` on the effect side (has a catchment)?
constexpr bool isEffectSide(BlockKind k) noexcept {
  return k == BlockKind::PreEffect || k == BlockKind::PostEffect || k == BlockKind::PowerEffect || k == BlockKind::Logic ||
         k == BlockKind::Controller || k == BlockKind::Listener || k == BlockKind::Modulator;
}
/// v1 classes deriving from PowerEffect (Power, Toggle, Pulse, controllers) are excluded from audio chains.
constexpr bool isPowerEffectLike(BlockKind k) noexcept {
  return k == BlockKind::PowerEffect || k == BlockKind::Logic || k == BlockKind::Controller || k == BlockKind::Listener ||
         k == BlockKind::Modulator;
}
/// SPEC-CONNECTIONS-PROXIMITY R2/R3: which source/effect kind pairs may connect.
constexpr bool kindsMayConnect(BlockKind source, BlockKind effect) noexcept {
  if (!isSourceSide(source) || !isEffectSide(effect)) return false;
  // A listener (Sound Laser, CHG-0016) hears audio sources only.
  if (effect == BlockKind::Listener) return source == BlockKind::AudioSource;
  // Emitters and Lasers also take keyboards (owner review 2, beyond v1): a held key powers them, its note aims them.
  if (source == BlockKind::PowerSource) return effect == BlockKind::PowerEffect || effect == BlockKind::Logic || effect == BlockKind::Controller;
  return true;
}

}  // namespace blokdust
