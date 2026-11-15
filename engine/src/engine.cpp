#include "blokdust/engine.hpp"

#include <limits>

#include <algorithm>
#include <cmath>

#include "blokdust/dmath.hpp"
#include "blokdust/geometry.hpp"

namespace blokdust {

namespace P = gen::param;

// Sample, Recorder and SampleGen are all v1 SamplerBase (Tone.Simpler): same params in the same order.
static_assert(P::SourceRecorder::playbackRate == P::SourceSample::playbackRate && P::SourceRecorder::loopEnd == P::SourceSample::loopEnd &&
              P::SourceRecorder::volume == P::SourceSample::volume && P::SourceSampleGen::loopEnd == P::SourceSample::loopEnd &&
              P::SourceSampleGen::reverse == P::SourceSample::reverse, "sampler params must line up");
namespace {
bool isSampler(BlockType t) noexcept { return t == BlockType::SourceSample || t == BlockType::SourceRecorder || t == BlockType::SourceSampleGen; }
}  // namespace

namespace {
constexpr double kBaseNoteHz = 261.6;  // v1 Config.BaseNote
constexpr double kDegToRad = 3.14159265358979323846 / 180.0;
}  // namespace

Engine::Engine(const EngineConfig& cfg)
    : sampleRate_(cfg.sampleRate), rng_(cfg.seed),
      wavetables_(cfg.parent ? cfg.parent->wavetables_ : std::make_shared<const dsp::WavetableBank>(cfg.sampleRate)),
      useCompressor_(cfg.masterCompressor && !cfg.child), hostInput_(cfg.hostInput), child_(cfg.child) {
  compressor_.configure(cfg.sampleRate);
  seed_ = cfg.seed;
  if (cfg.child) masterGain_ = 1.0;  // its mix is a source in the outer patch, which has the master stage
  gainGlide_ = 1.0 - dmath::exp(-1.0 / (0.005 * cfg.sampleRate));
  fadeLen_ = std::max(1, cfg.sampleRate / 200);  // 5 ms out + 5 ms in (SPEC-CONNECTIONS-PROXIMITY R5: ≤ 10 ms)
  const auto pow2 = [](double n) { std::uint32_t s = 2; while (s < n) s <<= 1; return s; };
  const double sr = cfg.sampleRate;
  const int div = cfg.child ? 4 : 1;  // an inner world has a quarter of each pool
  reverbPool_.init(8, pow2(0.0367 * sr + 4), kMaxReverbs / div);   // Freeverb combs (longest 1617/44100 s)
  delayPool_.init(3, pow2(kMaxDelaySeconds * sr + 4), kMaxDelays / div);  // PingPong: v1 delayTime ≤ 0.5 s; synced ≤ 1 s
  chorusPool_.init(4, pow2(0.0165 * sr + 132), kMaxChoruses / div); // modulated delays ≤ 16 ms, + 128-frame quanta
  pitchPool_.init(4, pow2(dsp::PitchShiftFx::kWindow * sr + 4), kMaxPitchShifters / div);  // A/B delays per side
  const int maxTaps = static_cast<int>(kMaxImpulseSeconds * sr);
  if (cfg.parent) defaultImpulse_ = cfg.parent->defaultImpulse_;
  else {
    auto kernel = std::make_shared<dsp::ConvolutionKernel>();
    kernel->reserve(maxTaps);
    std::vector<float> l(static_cast<std::size_t>(maxTaps)), r(static_cast<std::size_t>(maxTaps));
    dsp::makeDefaultImpulse(l.data(), r.data(), maxTaps, sr);
    kernel->build(l.data(), r.data(), static_cast<std::uint32_t>(maxTaps), sr, sr);
    defaultImpulse_ = kernel;
  }
  const int convolvers = kMaxConvolvers / div;
  convolvers_.resize(static_cast<std::size_t>(convolvers)); userImpulses_.resize(static_cast<std::size_t>(convolvers));
  for (auto& c : convolvers_) c.reserve(defaultImpulse_->maxTailParts());
  for (auto& k : userImpulses_) k.reserve(maxTaps);
  convolverOwner_.assign(static_cast<std::size_t>(convolvers), -1);
  compressors_.resize(static_cast<std::size_t>(kMaxCompressors / div));
  for (auto& c : compressors_) c.configure(cfg.sampleRate);
  compressorOwner_.assign(compressors_.size(), -1);
  listenBuf_.assign(static_cast<std::size_t>(kMaxListeners) * kMaxSegment, 0.0f);
  listenerOwner_.fill(-1);
  listenDecay_ = dmath::exp(-1.0 / (0.05 * cfg.sampleRate));
  stageOwner_.fill(-1);
  if (!cfg.child) stageBuf_.assign(static_cast<std::size_t>(kMaxStages) * 2 * kMaxSegment, 0.0f);
}

/// R13b: does Stage `b` keep its inner world's particles in flight when it loses power? Not while this world's POWER
/// switch is off: that clears particles everywhere.
bool Engine::keepsParticles(const Block& b) const noexcept {
  return worldPower_ && b.params[P::SourceStage::keepParticles] != 0.0;
}

/// A Stage block's inner world (CHG-0021). From here its clock is this engine's: the same sample, the same tick grid
/// and beat, so both worlds tick together however the host cuts the timeline. Its world power is the block's power.
bool Engine::attachStage(BlockId id, Engine* inner) noexcept {
  const int slot = slotOf(id);
  if (slot < 0 || child_ || inner == this) return false;
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  if (b.type != BlockType::SourceStage || b.poolIndex < 0 || (inner && !inner->child_)) return false;
  stages_[static_cast<std::size_t>(b.poolIndex)] = inner;
  stageNoteCount_[static_cast<std::size_t>(b.poolIndex)] = 0;
  if (!inner) return true;
  inner->hostInput_ = hostInput_;  // the plugins' Microphone is the host input, inside a Stage too
  inner->sample_ = sample_; inner->tick_ = tick_; inner->tickOrigin_ = tickOrigin_; inner->tickBase_ = tickBase_;
  inner->tempo_ = tempo_; inner->beat_ = beat_;
  inner->worldPower_ = true;
  inner->apply(Command::worldPower(b.powerOn, -1, keepsParticles(b)));
  return true;
}

Engine* Engine::stage(BlockId id) const noexcept {
  const int slot = slotOf(id);
  if (slot < 0) return nullptr;
  const Block& b = blocks_[static_cast<std::size_t>(slot)];
  return b.type == BlockType::SourceStage && b.poolIndex >= 0 ? stages_[static_cast<std::size_t>(b.poolIndex)] : nullptr;
}

bool Engine::attachSample(BlockId id, const SampleBuffer& sb) noexcept {
  const int slot = slotOf(id);
  if (slot < 0) return false;
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  if (b.type == BlockType::FxConvolver) {
    if (b.poolIndex < 0) return false;
    auto& k = userImpulses_[static_cast<std::size_t>(b.poolIndex)];
    k.build(sb.left, sb.right, sb.left ? sb.frames : 0, sb.sampleRate > 0 ? sb.sampleRate : sampleRate_, sampleRate_);
    b.userImpulse = k.valid();
    return true;
  }
  if (!isSampler(b.type) && b.type != BlockType::SourceGranular) return false;
  b.sampleL = sb.frames ? sb.left : nullptr;
  b.sampleR = sb.frames ? (sb.right ? sb.right : sb.left) : nullptr;
  b.sampleFrames = sb.left ? sb.frames : 0;
  b.sampleRate = sb.sampleRate > 0 ? sb.sampleRate : sampleRate_;
  for (auto& v : b.voices) v.samplePlaying = false;
  for (auto& g : b.grains) g.on = false;
  if (b.type == BlockType::SourceGranular) {  // v1 SetupGrains: a new file starts at its middle unless the patch says
    if (b.sampleFrames && b.params[P::SourceGranular::region] <= 0.0) b.params[P::SourceGranular::region] = b.sampleFrames / b.sampleRate / 2.0;
    return true;
  }
  if (b.sampleFrames && b.params[P::SourceSample::endPosition] <= 0.0) {  // v1 Sample.SetBuffers defaults
    const double dur = b.sampleFrames / b.sampleRate;
    b.params[P::SourceSample::startPosition] = 0.0;
    b.params[P::SourceSample::endPosition] = dur;
    b.params[P::SourceSample::loopStart] = dur * 0.5;
    b.params[P::SourceSample::loopEnd] = dur;
  }
  configureDsp(b);
  for (auto& v : b.voices) if (v.active) {  // v1: retrigger if playing
    v.playhead = b.params[P::SourceSample::startPosition] * b.sampleRate; v.samplePlaying = b.sampleFrames > 0; v.env.gateOn();
  }
  return true;
}

void Engine::FxPool::init(int linesPer, std::uint32_t size, int count) {
  lines = linesPer; lineSize = size; capacity = count;
  mem.assign(static_cast<std::size_t>(linesPer) * size * static_cast<std::size_t>(count), 0.0f);
  owner.assign(static_cast<std::size_t>(count), -1);
}

int Engine::FxPool::acquire(int slot) noexcept {
  for (int i = 0; i < capacity; ++i) if (owner[static_cast<std::size_t>(i)] < 0) { owner[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot); return i; }
  return -1;
}

void Engine::acquireDsp(Block& b, int slot) noexcept {
  FxPool* pool = b.type == BlockType::FxReverb ? &reverbPool_ : b.type == BlockType::FxStereoDelay ? &delayPool_
               : b.type == BlockType::FxChorus ? &chorusPool_ : nullptr;
  if (b.type == BlockType::SourceNoise)  // voice 0 keeps the original seed (golden renders); the others derive from it
    for (int v = 0; v < kVoices; ++v) b.voices[static_cast<std::size_t>(v)].noise.seed(seed_ * 0x9E3779B97F4A7C15ULL + b.id + static_cast<std::uint64_t>(v) * 0x1000193ULL);
  if (b.type == BlockType::FxConvolver) {
    for (int i = 0; i < static_cast<int>(convolverOwner_.size()); ++i) if (convolverOwner_[static_cast<std::size_t>(i)] < 0) {
      convolverOwner_[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
      convolvers_[static_cast<std::size_t>(i)].reset();
      b.poolIndex = static_cast<std::int16_t>(i); b.userImpulse = false;
      break;
    }
    return;
  }
  if (b.type == BlockType::SourceStage) {  // a place for an inner world (none in a child: depth 2, SCOPE-0006)
    if (!child_) for (int i = 0; i < kMaxStages; ++i) if (stageOwner_[static_cast<std::size_t>(i)] < 0) {
      stageOwner_[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
      stages_[static_cast<std::size_t>(i)] = nullptr;
      stageNoteCount_[static_cast<std::size_t>(i)] = 0;
      b.poolIndex = static_cast<std::int16_t>(i);
      break;
    }
    return;
  }
  if (b.type == BlockType::PowerSoundLaser) {
    for (int i = 0; i < kMaxListeners; ++i) if (listenerOwner_[static_cast<std::size_t>(i)] < 0) {
      listenerOwner_[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
      b.poolIndex = static_cast<std::int16_t>(i);
      break;
    }
    return;
  }
  if (b.type == BlockType::FxCompressor) {
    for (int i = 0; i < static_cast<int>(compressorOwner_.size()); ++i) if (compressorOwner_[static_cast<std::size_t>(i)] < 0) {
      compressorOwner_[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
      compressors_[static_cast<std::size_t>(i)].reset();
      b.poolIndex = static_cast<std::int16_t>(i); b.mon[0] = -100.0f;
      break;
    }
    return;
  }
  if (b.type == BlockType::FxPitchShifter) pool = &pitchPool_;
  if (!pool) return;
  b.poolIndex = static_cast<std::int16_t>(pool->acquire(slot));
  if (b.poolIndex < 0) return;  // exhausted: the effect passes audio through unchanged
  const int i = b.poolIndex;
  if (b.type == BlockType::FxReverb) for (int k = 0; k < 8; ++k) b.reverb.comb[static_cast<std::size_t>(k)].attach(pool->line(i, k));
  if (b.type == BlockType::FxStereoDelay) { b.pingpong.dl.attach(pool->line(i, 0)); b.pingpong.dr.attach(pool->line(i, 1)); b.pingpong.pre.attach(pool->line(i, 2)); }
  if (b.type == BlockType::FxPitchShifter) {
    b.pitchshift.aL.attach(pool->line(i, 0)); b.pitchshift.aR.attach(pool->line(i, 1));
    b.pitchshift.bL.attach(pool->line(i, 2)); b.pitchshift.bR.attach(pool->line(i, 3));
  }
  if (b.type == BlockType::FxChorus) {
    b.chorus.dl.attach(pool->line(i, 0)); b.chorus.dr.attach(pool->line(i, 1));
    b.chorus.qL.attach(pool->line(i, 2)); b.chorus.qR.attach(pool->line(i, 3));
  }
}

void Engine::releaseDsp(Block& b) noexcept {
  if (b.type == BlockType::FxReverb) reverbPool_.release(b.poolIndex);
  if (b.type == BlockType::FxStereoDelay) delayPool_.release(b.poolIndex);
  if (b.type == BlockType::FxChorus) chorusPool_.release(b.poolIndex);
  if (b.type == BlockType::FxPitchShifter) pitchPool_.release(b.poolIndex);
  if (b.type == BlockType::FxConvolver && b.poolIndex >= 0) convolverOwner_[static_cast<std::size_t>(b.poolIndex)] = -1;
  if (b.type == BlockType::SourceStage && b.poolIndex >= 0) { stageOwner_[static_cast<std::size_t>(b.poolIndex)] = -1; stages_[static_cast<std::size_t>(b.poolIndex)] = nullptr; }
  if (b.type == BlockType::PowerSoundLaser && b.poolIndex >= 0) listenerOwner_[static_cast<std::size_t>(b.poolIndex)] = -1;
  if (b.type == BlockType::FxCompressor && b.poolIndex >= 0) compressorOwner_[static_cast<std::size_t>(b.poolIndex)] = -1;
  b.poolIndex = -1;
}

bool Engine::mapAutomation(BlockType t, std::uint8_t param, double v, double& out) noexcept {
  const auto& inf = gen::info(t);
  if (param >= inf.paramCount) return false;
  const auto& p = inf.params[param];
  if (p.transform == gen::UiTransform::None) return false;
  v = std::clamp(v, 0.0, 1.0);
  const double ui = p.uiMin + v * (p.uiMax - p.uiMin);
  switch (p.transform) {
    case gen::UiTransform::Identity: out = ui; break;
    case gen::UiTransform::SubtractFrom: out = p.k - ui; break;
    case gen::UiTransform::Minus: out = ui - p.k; break;
    case gen::UiTransform::Divide: out = ui / p.k; break;
    case gen::UiTransform::None: return false;
  }
  return true;
}

int Engine::slotOf(BlockId id) const noexcept {
  if (id == kInvalidBlock) return -1;
  for (int i = 0; i < orderCount_; ++i) if (blocks_[order_[i]].id == id) return order_[i];
  return -1;
}

bool Engine::connected(BlockId a, BlockId b) const noexcept {
  const int sa = slotOf(a), sb = slotOf(b);
  return sa >= 0 && sb >= 0 && graph_.connected(sa, sb);
}

void Engine::log(Event::Type t, BlockId a, BlockId b) noexcept {
  if (eventCount_ >= kEventLogCapacity) { ++droppedEvents_; return; }
  events_[eventCount_++] = Event{sample_, tick_, t, a, b};
}

// ---------------------------------------------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------------------------------------------

void Engine::applyDueCommands() noexcept {
  while (const Command* c = queue_.front()) {
    if (c->atSample > sample_) break;  // FIFO: later commands wait for this one
    apply(*c);
    queue_.pop();
  }
}

void Engine::configureDsp(Block& b) noexcept {
  const double sr = sampleRate_;
  const auto& p = b.params;
  // Load-time params arrive as SetParam at the block's creation sample: they initialise, they do not glide.
  const bool first = !b.dspConfigured || sample_ == b.addedAt;
  b.dspConfigured = true;
  using T = dsp::Biquad::Type;
  switch (b.type) {
    case BlockType::SourceTone: case BlockType::SourceSample: case BlockType::SourceNoise:
    case BlockType::SourceRecorder: case BlockType::SourceSampleGen: case BlockType::SourceGranular: {
      const int slot = static_cast<int>(&b - blocks_.data());
      for (int v = 0; v < kVoices; ++v) {
        Voice& vo = b.voices[static_cast<std::size_t>(v)];
        if (first) vo.env.configure({}, sr);
        if (b.type == BlockType::SourceTone) vo.osc.setWaveform(static_cast<dsp::Waveform>(std::clamp(static_cast<int>(p[P::SourceTone::waveform]), 0, 3)));
        if (b.type == BlockType::SourceNoise) vo.noise.setType(static_cast<int>(p[P::SourceNoise::waveform]));
        if (b.type != BlockType::SourceNoise) setPitch(slot, v, 0.0);  // v1 NoteUpdate: re-pitch with the new mods
      }
      break;
    }
    case BlockType::FxFilter: {
      // Type (CHG-0010): Peak is v1's filter (Q 1 unless set). Gain is the Peak's gain, the Low/High pass resonance
      // (Web Audio's Q, in dB) or the Band pass level (a Web Audio band pass has no gain).
      const int type = std::clamp(static_cast<int>(p[P::FxFilter::type]), 0, 3);
      const double hz = p[P::FxFilter::frequency], gain = p[P::FxFilter::gain], q = p[P::FxFilter::Q];
      if (type == 1 || type == 2) b.filter.set(0, type == 1 ? T::Lowpass : T::Highpass, hz, gain, 0.0, sr);
      else b.filter.set(0, type == 3 ? T::Bandpass : T::Peaking, hz, q, gain, sr);
      b.filterLevel = type == 3 ? static_cast<float>(dmath::exp10(gain / 20.0)) : 1.0f;
      break;
    }
    case BlockType::FxEq:
      b.eq.set(0, T::Lowshelf, p[P::FxEq::frequency_1], p[P::FxEq::Q_1], p[P::FxEq::gain_1], sr);
      b.eq.set(1, T::Peaking, p[P::FxEq::frequency_2], p[P::FxEq::Q_2], p[P::FxEq::gain_2], sr);
      b.eq.set(2, T::Peaking, p[P::FxEq::frequency_3], p[P::FxEq::Q_3], p[P::FxEq::gain_3], sr);
      b.eq.set(3, T::Highshelf, p[P::FxEq::frequency_4], p[P::FxEq::Q_4], p[P::FxEq::gain_4], sr);
      break;
    case BlockType::FxVolume: b.volume.set(p[P::FxVolume::gain]); break;
    case BlockType::FxDistortion: b.distortion.set(p[P::FxDistortion::drive], p[P::FxDistortion::mix]); break;
    case BlockType::FxBitCrusher: b.crusher.set(p[P::FxBitCrusher::bits], p[P::FxBitCrusher::mix]); break;
    case BlockType::FxPhaser:
      b.phaser.configure(p[P::FxPhaser::rate], p[P::FxPhaser::depth], p[P::FxPhaser::baseFrequency], p[P::FxPhaser::mix], sr, first);
      break;
    case BlockType::FxChorus:
      b.chorus.configure(p[P::FxChorus::rate], p[P::FxChorus::delayTime], p[P::FxChorus::depth], p[P::FxChorus::feedback], sr, first);
      break;
    case BlockType::FxReverb:
      b.reverb.configure(p[P::FxReverb::mix], sr);
      if (sample_ == b.addedAt) {
        // v1 bug kept for parity: Reverb.Init calls new Tone.Freeverb(dampening, roomSize) but Freeverb's arguments are
        // (roomSize, dampening), so a freshly created or loaded v1 Reverb runs with the two swapped. Moving a slider
        // later (SetParam) sets the named one correctly. Measured: matches v1 within 0.02 dB (SPEC-AUDIO-V1-PARITY).
        b.reverb.setRoomSize(p[P::FxReverb::dampening]);
        b.reverb.setDampening(p[P::FxReverb::roomSize]);
      } else if (b.lastParam == P::FxReverb::roomSize) {
        b.reverb.setRoomSize(p[P::FxReverb::roomSize]);
      } else if (b.lastParam == P::FxReverb::dampening) {
        b.reverb.setDampening(p[P::FxReverb::dampening]);
      }
      break;
    case BlockType::FxStereoDelay: {
      // Synced (owner, 2026-11-10): beats at the patch's or host's tempo, gliding to a new tempo as to a new time.
      const double t = p[P::FxStereoDelay::sync] != 0.0 ? std::min(p[P::FxStereoDelay::delayBeats] * 60.0 / tempo_, kMaxDelaySeconds)
                                                        : std::clamp(p[P::FxStereoDelay::delayTime], 0.0, 0.5);
      b.pingpong.configure(t, p[P::FxStereoDelay::feedback], p[P::FxStereoDelay::mix], sr, first);
      break;
    }
    case BlockType::FxAutoWah:
      b.autowah.configure(p[P::FxAutoWah::octaves], p[P::FxAutoWah::baseFrequency], p[P::FxAutoWah::mix], p[P::FxAutoWah::attack], p[P::FxAutoWah::release], sr);
      break;
    case BlockType::FxChomp:
      b.chomp.configure(p[P::FxChomp::rate], p[P::FxChomp::Q], p[P::FxChomp::gain], sr, first, seed_ * 0x9E3779B97F4A7C15ULL + b.id);
      break;
    case BlockType::FxChopper:
      b.chopper.configure(p[P::FxChopper::rate], p[P::FxChopper::depth], p[P::FxChopper::spread], static_cast<int>(p[P::FxChopper::waveform]), p[P::FxChopper::mix], sr, first);
      break;
    case BlockType::FxPitchShifter: b.pitchshift.configure(p[P::FxPitchShifter::pitchOffset], p[P::FxPitchShifter::mix], sr, first); break;
    case BlockType::PowerSoundLaser: {  // Band: two biquads in series on what it hears (b.eq's left pair)
      const int band = std::clamp(static_cast<int>(std::lround(p[P::PowerSoundLaser::band])), 0, 3);
      if (band == 1) { b.eq.l[0].set(T::Lowpass, 250.0, 0.0, 0.0, sr); b.eq.l[1].set(T::Lowpass, 250.0, 0.0, 0.0, sr); }
      else if (band == 2) { b.eq.l[0].set(T::Highpass, 250.0, 0.0, 0.0, sr); b.eq.l[1].set(T::Lowpass, 2500.0, 0.0, 0.0, sr); }
      else if (band == 3) { b.eq.l[0].set(T::Highpass, 2500.0, 0.0, 0.0, sr); b.eq.l[1].set(T::Highpass, 2500.0, 0.0, 0.0, sr); }
      break;
    }
    case BlockType::FxCompressor:
      if (b.poolIndex >= 0)
        compressors_[static_cast<std::size_t>(b.poolIndex)].setParams(std::clamp(p[P::FxCompressor::threshold], -100.0, 0.0), std::clamp(p[P::FxCompressor::knee], 0.0, 40.0),
          std::clamp(p[P::FxCompressor::ratio], 1.0, 20.0), std::clamp(p[P::FxCompressor::attack], 0.0, 1.0), std::clamp(p[P::FxCompressor::release], 0.01, 1.0));
      break;
    case BlockType::FxVibrato: case BlockType::FxScuzz: {
      const bool vib = b.type == BlockType::FxVibrato;
      const double rate = vib ? p[P::FxVibrato::rate] : p[P::FxScuzz::rate], depth = vib ? p[P::FxVibrato::depth] : p[P::FxScuzz::depth];
      const auto wave = static_cast<dsp::Waveform>(std::clamp(static_cast<int>(vib ? p[P::FxVibrato::waveform] : p[P::FxScuzz::waveform]), 0, 3));
      if (first) b.lfo.set(rate, wave, 0, -depth, depth, sr);
      else { b.lfo.setRate(rate); b.lfo.setRange(-depth, depth); b.lfo.set(rate, wave, 0, -depth, depth, sr); }
      break;
    }
    default: break;
  }
}

/// The ADSR an Envelope block in `slot`'s chain imposes (v1 Envelope.UpdateConnections; the last one in chain order
/// wins), or the source default.
dsp::Envelope::Settings Engine::envelopeFor(int slot) const noexcept {
  dsp::Envelope::Settings s{};
  const int c = chains_.chainOf[static_cast<std::size_t>(slot)];
  if (c < 0) return s;
  const auto r = chains_.chains[static_cast<std::size_t>(c)];
  for (int m = 0; m < r.count; ++m) {
    const Block& e = blocks_[chains_.members[r.start + m]];
    if (e.type != BlockType::FxEnvelope) continue;
    s.attack = e.params[P::FxEnvelope::attack]; s.decay = e.params[P::FxEnvelope::decay];
    s.sustain = e.params[P::FxEnvelope::sustain]; s.release = e.params[P::FxEnvelope::release];
  }
  return s;
}

void Engine::apply(const Command& c) noexcept {
  switch (c.type) {
    case Command::Type::AddBlock: {
      if (slotOf(c.id) >= 0 || c.id == kInvalidBlock) return;
      int slot = -1;
      for (int i = 0; i < kMaxBlocks; ++i) if (!blocks_[i].alive) { slot = i; break; }
      if (slot < 0) return;
      Block& b = blocks_[slot];
      b = Block{};
      b.alive = true; b.id = c.id; b.type = c.blockType; b.x = c.x; b.y = c.y; b.order = nextOrder_++; b.addedAt = sample_;
      const auto& inf = gen::info(c.blockType);
      for (int p = 0; p < inf.paramCount; ++p) b.params[p] = inf.params[p].defaultValue;
      if (b.type == BlockType::PowerLaser) b.laserAngle0 = b.params[P::PowerLaser::angle];
      // v1 ParticleEmitter.Init sets _rateCounter = 0: a self-powered emitter first fires after one interval;
      // an unpowered emitter primes its counter each tick, so it fires immediately once powered (runTick).
      b.emitCounter = 0;
      b.grainRng = Pcg32(0x6A1A5EEDULL ^ c.id, c.id);
      acquireDsp(b, slot);
      configureDsp(b);
      order_[orderCount_++] = static_cast<std::uint16_t>(slot);
      const auto before = graph_.row(slot);
      graph_.updateSlot(blocks_, slot);
      onTopologyChanged(slot, before);
      break;
    }
    case Command::Type::RemoveBlock: {
      const int slot = slotOf(c.id);
      if (slot < 0) return;
      const auto before = graph_.row(slot);
      if (blocks_[slot].gated()) log(Event::Type::GateOff, blocks_[slot].id);
      if (blocks_[slot].type == BlockType::PowerLaser || blocks_[slot].type == BlockType::PowerSoundLaser) releaseLaser(blocks_[slot]);
      for (int k = 0; k < orderCount_; ++k) blocks_[order_[k]].laserHits.reset(static_cast<std::size_t>(slot));  // slot may be reused
      blocks_[slot].alive = false;
      const auto end = std::remove(order_.begin(), order_.begin() + orderCount_, static_cast<std::uint16_t>(slot));
      orderCount_ = static_cast<int>(end - order_.begin());
      graph_.updateSlot(blocks_, slot);
      onTopologyChanged(slot, before);
      releaseDsp(blocks_[slot]);
      blocks_[slot] = Block{};
      break;
    }
    case Command::Type::MoveBlock: {
      const int slot = slotOf(c.id);
      if (slot < 0) return;
      blocks_[slot].x = c.x; blocks_[slot].y = c.y;
      const auto before = graph_.row(slot);
      if (graph_.updateSlot(blocks_, slot)) onTopologyChanged(slot, before);
      break;
    }
    case Command::Type::SetParam: {
      const int slot = slotOf(c.id);
      if (slot < 0) return;
      Block& b = blocks_[slot];
      if (c.param >= b.info().paramCount) return;
      // v1 SamplerBase.ReverseTrack → SwitchBuffer → RetriggerActiveVoices: reversing restarts sounding voices at the
      // region start (owner review 2026-11-07).
      const bool reversed = isSampler(b.type) && c.param == P::SourceSample::reverse && (b.params[c.param] != 0.0) != (c.value != 0.0);
      b.params[c.param] = c.value;
      if (b.modMask & (1u << c.param)) b.modBase[c.param] = c.value;  // an LFO is moving it: this is where it is set (CHG-0018)
      if (b.type == BlockType::PowerLaser && c.param == P::PowerLaser::angle) b.laserAngle0 = c.value;
      if (reversed) for (auto& v : b.voices) if (v.active && b.sampleFrames) {
        v.playhead = b.params[P::SourceSample::startPosition] * b.sampleRate; v.samplePlaying = true; v.env.gateOn();
      }
      b.lastParam = c.param;
      configureDsp(b);
      b.lastParam = 255;
      if (b.type == BlockType::PowerToggle) recomputeStaticPower();
      // R13b: Keep Particles turned off while the Stage is unpowered: what was kept in flight vanishes now.
      if (b.type == BlockType::SourceStage && c.param == P::SourceStage::keepParticles && !b.powerOn && b.poolIndex >= 0)
        if (Engine* inner = stages_[static_cast<std::size_t>(b.poolIndex)]) inner->applyNow(Command::worldPower(false, -1, keepsParticles(b)));
      if (b.type == BlockType::FxChord || b.type == BlockType::FxArpeggiator || b.type == BlockType::FxRandomNote) {
        // CHG-0017: the notes its sources are playing follow the new setting (no new trigger).
        const int ch = chains_.chainOf[static_cast<std::size_t>(slot)];
        if (ch >= 0) {
          const auto r = chains_.chains[static_cast<std::size_t>(ch)];
          for (int m = 0; m < r.count; ++m) {
            const int sslot = chains_.members[r.start + m];
            if (blocks_[static_cast<std::size_t>(sslot)].arranged) arrange(sslot, false);
          }
        }
      }
      if (b.kind() == BlockKind::Controller)  // transpose re-pitches, Mono/Poly re-voices (v1 Keyboard.SetParam)
        for (int k = 0; k < orderCount_; ++k) if (graph_.row(slot)[order_[k]] && blocks_[order_[k]].kind() == BlockKind::AudioSource) refreshVoices(order_[k]);
      break;
    }
    case Command::Type::NoteOn:
    case Command::Type::NoteOff: applyNote(c); break;
    case Command::Type::NoteExpression: applyExpression(c); break;
    case Command::Type::SetMaster: masterGain_ = std::clamp(c.value, 0.0, 4.0); break;
    case Command::Type::WorldPower: {
      const bool on = c.value != 0.0;
      // Particles in flight vanish, unless this is a Stage's world losing its power with Keep Particles on (R13b).
      // Sent again while off (the switch turned off, the world POWER switch off outside), it clears them then.
      if (!on && c.x == 0.0) particleCount_ = 0;
      // The world POWER switch off clears the particles in every Stage too, kept or not (owner, 2026-11-14).
      if (!on && c.x == 0.0) for (Engine* inner : stages_) if (inner) inner->applyNow(Command::worldPower(false));
      if (on == worldPower_) break;
      worldPower_ = on;
      if (on) for (int k = 0; k < orderCount_; ++k) blocks_[order_[k]].gateStep = 0;  // Counters start over (SIMULATION-0005)
      if (!on) {  // everything the world was powering lets go at once
        for (int k = 0; k < orderCount_; ++k) {
          Block& b = blocks_[order_[k]];
          b.pulsePower = 0;
          if (b.type == BlockType::PowerLaser || b.type == BlockType::PowerSoundLaser) releaseLaser(b);
        }
      }
      recomputeStaticPower();
      break;
    }
    case Command::Type::Tempo: {  // host tempo/transport or the patch's tempo (SIMULATION-0003)
      const double was = tempo_;
      tempo_ = std::clamp(c.value, 20.0, 400.0);
      if (tempo_ != was)  // synced delays follow the tempo
        for (int k = 0; k < orderCount_; ++k) {
          Block& d = blocks_[order_[k]];
          if (d.type == BlockType::FxStereoDelay && d.params[P::FxStereoDelay::sync] != 0.0) configureDsp(d);
        }
      // c.x is the position *now* (sample_); beat_ is the position at the next tick, where the simulation reads it.
      // Transport start: the tick grid restarts here, so the next tick is now and every take ticks alike.
      if (c.y != 0.0 && c.x >= 0.0) { tickOrigin_ = sample_; tickBase_ = tick_; resyncToTransport(c.x); }
      if (c.x >= 0.0) beat_ = c.x + static_cast<double>(tickSample(tick_) - sample_) / sampleRate_ * tempo_ / 60.0;
      for (Engine* inner : stages_) if (inner) inner->applyNow(c);  // inner worlds keep this one's tempo and transport (CHG-0021)
      break;
    }
    case Command::Type::Press: {  // only v1 Source subclasses (audio and power sources) power themselves when pressed
      const int slot = slotOf(c.id);
      if (slot < 0) return;
      Block& b = blocks_[slot];
      if (b.kind() == BlockKind::AudioSource || b.kind() == BlockKind::PowerSource) b.pressPower = c.value != 0.0 ? 1 : 0;
      break;
    }
    case Command::Type::Relink: {  // R4a: replays a saved connection order
      const int a = slotOf(c.id), b = slotOf(static_cast<BlockId>(c.value));
      if (a < 0 || b < 0 || !graph_.touch(a, b)) return;
      chains_.rebuild(blocks_, graph_, order_, orderCount_);
      routingDirty_ = true;
      break;
    }
  }
}

// The Touchpad (CHG-0019) is a keyboard to the engine: its first params line up with the Computer Keyboard's.
static_assert(P::InputTouchpad::transpose == P::InputComputerKeyboard::transpose && P::InputTouchpad::glide == P::InputComputerKeyboard::glide &&
              P::InputTouchpad::isPolyphonic == P::InputComputerKeyboard::isPolyphonic && P::InputTouchpad::polyphonic == P::InputComputerKeyboard::polyphonic,
              "controller params must line up");
static_assert(P::InputStageIn::transpose == P::InputComputerKeyboard::transpose && P::InputStageIn::glide == P::InputComputerKeyboard::glide &&
              P::InputStageIn::isPolyphonic == P::InputComputerKeyboard::isPolyphonic && P::InputStageIn::polyphonic == P::InputComputerKeyboard::polyphonic &&
              P::InputStageIn::keysSetPitch == P::InputComputerKeyboard::keysSetPitch, "Stage In is a keyboard to the engine");
namespace {
bool polyOf(const Block& c) noexcept { return c.params[P::InputComputerKeyboard::isPolyphonic] != 0.0 || c.params[P::InputComputerKeyboard::polyphonic] != 0.0; }
}  // namespace

/// v1 Controller.NoteOn/NoteOff: the controller messages every connected source with its id, the key, its polyphony
/// and glide (computer keyboard and MIDI controller share Keyboard's params).
/// MIDI Input's channel filter (CHG-0004): Omni (0) or 1–16; with MPE on, every channel (the zone's member channels
/// are chosen by the host's MPE parser). The computer keyboard has no channel.
bool Engine::acceptsChannel(const Block& ctrl, int channel) noexcept {
  if (ctrl.type != BlockType::InputMidiController) return true;
  const int want = static_cast<int>(ctrl.params[P::InputMidiController::channel]);
  return ctrl.params[P::InputMidiController::mpe] != 0.0 || want <= 0 || want == channel + 1;
}

namespace {
/// A key's clock position: C = 12 o'clock (the default −90°), each semitone 30° clockwise, in the lasers' range (−270, 90].
double keyAngle(int note) noexcept {
  const double a = -90.0 + 30.0 * (note % 12);
  return a > 90.0 ? a - 360.0 : a;
}
}  // namespace

/// A keyboard's key on a connected Emitter or Laser (owner review 2, beyond v1): held keys power it, like a Toggle;
/// the newest held key aims it, the 12 notes of the octave as 12 clock positions (letting it go aims at the newest
/// one left). Every key pressed fires an Emitter once at its own angle, legato and chords too (CHG-0009); held, a
/// mono keyboard's newest key repeats at the Emitter's rate, a polyphonic keyboard's every held key.
void Engine::keyAim(Block& b, int note, bool down, bool poly) noexcept {
  if (note < 0 || note >= 128) return;
  const auto key = static_cast<std::uint8_t>(note);
  int n = 0;
  for (int i = 0; i < b.keyCount; ++i) if (b.keysHeld[static_cast<std::size_t>(i)] != key) b.keysHeld[static_cast<std::size_t>(n++)] = b.keysHeld[static_cast<std::size_t>(i)];
  b.keyCount = n;
  if (down) {
    if (b.keyCount == static_cast<int>(b.keysHeld.size())) {  // full: the oldest goes
      std::copy(b.keysHeld.begin() + 1, b.keysHeld.end(), b.keysHeld.begin());
      --b.keyCount;
    }
    b.keysHeld[static_cast<std::size_t>(b.keyCount++)] = key;
    b.keyPoly = poly;
    if (b.type == BlockType::PowerEmitter && b.keyPressCount < static_cast<int>(b.keyPresses.size()))
      b.keyPresses[static_cast<std::size_t>(b.keyPressCount++)] = key;
  }
  b.keyPower = b.keyCount > 0 ? 1 : 0;
  if (b.keyCount == 0) return;
  const double a = keyAngle(b.keysHeld[static_cast<std::size_t>(b.keyCount - 1)]);
  if (b.type == BlockType::PowerLaser) { b.params[P::PowerLaser::angle] = a; b.laserAngle0 = a; }
  else if (b.type == BlockType::PowerEmitter) b.params[P::PowerEmitter::angle] = a;
}

/// Does controller `ctrl` take note command `c`? The block it names; or every controller of its type (the computer's
/// keys, MIDI in); or, sent in from outside this Stage, every controller but the type that heard it already.
bool Engine::controllerHears(const Block& ctrl, const Command& c) const noexcept {
  if (ctrl.kind() != BlockKind::Controller) return false;
  if (c.outside) return ctrl.type != c.blockType;
  return c.id != kInvalidBlock ? ctrl.id == c.id : ctrl.type == c.blockType;
}

/// A note played on a controller touching Stage block `stage` goes in (CHG-0021, UI-0012): to the inner world's
/// controllers, a semitone for a semitone, moved by the outer controller's octave. Keys held are remembered, so the
/// note ends on the key it started on whatever the octave does meanwhile.
void Engine::forwardToStage(const Block& stage, const Block& ctrl, const Command& c) noexcept {
  if (stage.poolIndex < 0) return;
  const auto pi = static_cast<std::size_t>(stage.poolIndex);
  Engine* inner = stages_[pi];
  if (!inner) return;
  auto& held = stageNotes_[pi];
  int& count = stageNoteCount_[pi];
  const auto ch = static_cast<std::uint8_t>(std::clamp(static_cast<int>(c.x), 0, 15));
  int at = -1;
  for (int i = 0; i < count; ++i) if (held[static_cast<std::size_t>(i)].ctrl == ctrl.id && held[static_cast<std::size_t>(i)].key == c.param && held[static_cast<std::size_t>(i)].channel == ch) at = i;
  Command f = c;
  f.outside = true;
  f.id = kInvalidBlock;
  f.blockType = c.id == kInvalidBlock && !c.outside ? c.blockType : BlockType::SourceStage;  // no controller is a Stage
  f.atSample = -1;
  if (c.type == Command::Type::NoteOn) {
    const int sent = std::clamp(static_cast<int>(c.param) + 12 * static_cast<int>(std::lround(ctrl.params[0])), 0, 127);  // param 0 = transpose
    if (at < 0) {
      if (count == kStageNotes) return;  // full: the note stays out
      at = count++;
    }
    held[static_cast<std::size_t>(at)] = {ctrl.id, c.param, ch, static_cast<std::uint8_t>(sent)};
    f.param = static_cast<std::uint8_t>(sent);
    inner->applyNow(f);
    return;
  }
  if (at < 0) return;
  f.param = held[static_cast<std::size_t>(at)].sent;
  if (c.type == Command::Type::NoteOff) held[static_cast<std::size_t>(at)] = held[static_cast<std::size_t>(--count)];
  inner->applyNow(f);
}

/// Notes held into a Stage by a controller that no longer touches it (moved away, removed) end there.
void Engine::releaseStageNotes() noexcept {
  for (int k = 0; k < orderCount_; ++k) {
    const Block& st = blocks_[order_[k]];
    if (st.type != BlockType::SourceStage || st.poolIndex < 0) continue;
    const auto pi = static_cast<std::size_t>(st.poolIndex);
    auto& held = stageNotes_[pi];
    int& count = stageNoteCount_[pi];
    for (int i = 0; i < count;) {
      const StageNote h = held[static_cast<std::size_t>(i)];
      const int cs = slotOf(h.ctrl);
      if (cs >= 0 && graph_.row(order_[k])[static_cast<std::size_t>(cs)]) { ++i; continue; }
      held[static_cast<std::size_t>(i)] = held[static_cast<std::size_t>(--count)];
      if (Engine* inner = stages_[pi]) {
        Command off = Command::noteOff(BlockType::SourceStage, h.sent, -1, h.channel);
        off.outside = true;
        inner->applyNow(off);
      }
    }
  }
}

void Engine::applyNote(const Command& c) noexcept {
  const int ch = std::clamp(static_cast<int>(c.x), 0, 15);
  // The computer's keys and MIDI in reach every world: a Keyboard inside a Stage plays from outside it (owner, 2026-11-14).
  if (c.id == kInvalidBlock && !c.outside) for (Engine* inner : stages_) if (inner) inner->applyNow(c);
  for (int k = 0; k < orderCount_; ++k) {
    const Block& ctrl = blocks_[order_[k]];
    if (!controllerHears(ctrl, c)) continue;
    if (!acceptsChannel(ctrl, ch)) continue;
    const auto row = graph_.row(order_[k]);
    for (int i = 0; i < orderCount_; ++i) {
      const int s = order_[i];
      if (row[s] && blocks_[s].type == BlockType::SourceStage) { forwardToStage(blocks_[static_cast<std::size_t>(s)], ctrl, c); continue; }
      if (row[s] && blocks_[s].kind() == BlockKind::PowerSource) { keyAim(blocks_[static_cast<std::size_t>(s)], c.param, c.type == Command::Type::NoteOn, polyOf(ctrl)); continue; }
      if (!row[s] || blocks_[s].kind() != BlockKind::AudioSource || blocks_[s].type == BlockType::SourceStage) continue;
      if (blocks_[s].arranged) {  // CHG-0017: the key joins or leaves the notes this source is given
        arrangedKey(s, ctrl, c.param, ch, c.type == Command::Type::NoteOn);
        if (c.type != Command::Type::NoteOn) continue;
      } else {
      if (c.type != Command::Type::NoteOn) { voiceOff(s, ctrl.id, c.param, ch); continue; }
      voiceOn(s, ctrl.id, c.param, polyOf(ctrl), std::max(0.0, ctrl.params[P::InputComputerKeyboard::glide]), true, ch);
      }
      // MIDI Input velocity (owner review 3): the note sounds at 0.2 + 0.8 × velocity² (1 at full velocity, never
      // silent), MPE or not. MPE pressure → volume (PLUGIN-0004) swells it from there to full, so the strike is heard
      // before the controller's first pressure message. (The Computer Keyboard keeps v1's fixed level.)
      if (ctrl.type == BlockType::InputMidiController) {
        const double v = std::clamp(c.value, 0.0, 1.0), level = 0.2 + 0.8 * v * v;
        for (auto& vo : blocks_[static_cast<std::size_t>(s)].voices)
          if (vo.active && vo.controller == ctrl.id && vo.key == c.param && vo.channel == ch && vo.trigTick == tick_)
            vo.pressureFloor = vo.exprGain = vo.gainNow = level;
      }
    }
  }
}

/// Per-note expression (PLUGIN-0004): the voices playing this note on this channel for this controller follow it.
/// Bend re-pitches (semitones); pressure sets the voice's volume and slide its timbre, as the MIDI Input maps them
/// (owner defaults: pressure → volume, slide → Tone brightness / Sample start).
void Engine::applyExpression(const Command& c) noexcept {
  const int ch = std::clamp(static_cast<int>(c.x), 0, 15);
  const auto dim = static_cast<Command::Expression>(std::clamp(static_cast<int>(c.y), 0, 2));
  if (c.id == kInvalidBlock && !c.outside) for (Engine* inner : stages_) if (inner) inner->applyNow(c);  // as applyNote
  for (int k = 0; k < orderCount_; ++k) {
    const Block& ctrl = blocks_[order_[k]];
    if (!controllerHears(ctrl, c)) continue;
    if (!acceptsChannel(ctrl, ch)) continue;
    const bool midi = ctrl.type == BlockType::InputMidiController;
    const bool pressureOn = !midi || ctrl.params[P::InputMidiController::pressureTo] >= 0.5;
    const bool slideOn = !midi || ctrl.params[P::InputMidiController::slideTo] >= 0.5;
    const auto row = graph_.row(order_[k]);
    for (int i = 0; i < orderCount_; ++i) {
      const int s = order_[i];
      if (row[s] && blocks_[s].type == BlockType::SourceStage) { forwardToStage(blocks_[static_cast<std::size_t>(s)], ctrl, c); continue; }
      if (!row[s] || blocks_[s].kind() != BlockKind::AudioSource) continue;
      Block& b = blocks_[static_cast<std::size_t>(s)];
      if (b.arranged && dim == Command::Expression::Bend) {
        // An arranged source (AUDIO-0002): the held key itself moves, so Chord, Arpeggiator and Random Note work from
        // where it slid to (a Touchpad slide, an MPE bend; owner 2026-11-14).
        bool held = false;
        for (int j = 0; j < b.arrKeyCount; ++j) {
          auto& h = b.arrKeys[static_cast<std::size_t>(j)];
          if (h.key == c.param && h.controller == ctrl.id && h.channel == ch) { h.bend = std::clamp(c.value, -96.0, 96.0); held = true; }
        }
        if (held) arrange(s, false);
        continue;
      }
      for (int v = 0; v < kVoices; ++v) {
        Voice& vo = b.voices[static_cast<std::size_t>(v)];
        if (!vo.active || vo.controller != ctrl.id || vo.key != c.param || vo.channel != ch) continue;
        if (dim == Command::Expression::Bend) { vo.bend = std::clamp(c.value, -96.0, 96.0); setPitch(s, v, 0.0); }
        else if (dim == Command::Expression::Pressure) vo.exprGain = pressureOn ? vo.pressureFloor + (1.0 - vo.pressureFloor) * std::clamp(c.value, 0.0, 1.0) : vo.pressureFloor;
        else if (slideOn) {
          const double x = std::clamp(c.value, 0.0, 1.0);
          if (b.type == BlockType::SourceTone) {
            // Brightness: a one-pole low-pass from 78 Hz (slide 0) to 20 kHz (slide 1), 8 octaves.
            const double fc = 20000.0 * dmath::exp2((x - 1.0) * 8.0);
            vo.lpA = std::min(1.0, 1.0 - dmath::exp(-2.0 * 3.141592653589793 * fc / sampleRate_));
          } else if (b.type == BlockType::SourceGranular) {
            vo.slide = x;  // grain position across the file
          } else if (isSampler(b.type) && vo.trigTick == tick_ && b.sampleFrames) {
            // Sample start: a slide sent with the note picks where in the region it starts.
            const double st = b.params[P::SourceSample::startPosition], en = b.params[P::SourceSample::endPosition] > 0 ? b.params[P::SourceSample::endPosition] : b.sampleFrames / b.sampleRate;
            vo.playhead = (st + x * std::max(0.0, en - st)) * b.sampleRate;
          }
        }
      }
    }
  }
}

/// v1 Source.NoteOn + GetVoice: mono takes (or keeps) the mono voice, poly the first free voice; with none free the
/// oldest active voice is stolen without retriggering. Glide only when nothing is triggered and ≤ 1 voice is active.
void Engine::voiceOn(int slot, BlockId controller, int key, bool poly, double glide, bool envFromChain, int channel, double offset) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  const auto freeVoice = [&b]() {
    int best = -1;
    for (int v = 0; v < b.voiceCount; ++v) {
      const Voice& vo = b.voices[static_cast<std::size_t>(v)];
      if (!vo.active && (best < 0 || vo.freedAt < b.voices[static_cast<std::size_t>(best)].freedAt)) best = v;
    }
    return best;
  };
  const auto oldestActive = [&b]() {
    int best = -1;
    for (int v = 0; v < b.voiceCount; ++v) {
      const Voice& vo = b.voices[static_cast<std::size_t>(v)];
      if (vo.active && (best < 0 || vo.activeAt < b.voices[static_cast<std::size_t>(best)].activeAt)) best = v;
    }
    return best;
  };
  int v = -1;
  bool trigger = true, fromRelease = false;
  if (!poly && controller != 0) {  // mono: remember the key (owner review 3: return to it when a newer one is let go)
    int n = 0;
    for (int i = 0; i < b.monoHeldCount; ++i) {
      const auto& h = b.monoHeld[static_cast<std::size_t>(i)];
      if (h.key != key || h.controller != controller || h.channel != channel) b.monoHeld[static_cast<std::size_t>(n++)] = h;
    }
    if (n == static_cast<int>(b.monoHeld.size())) { std::copy(b.monoHeld.begin() + 1, b.monoHeld.end(), b.monoHeld.begin()); --n; }
    b.monoHeld[static_cast<std::size_t>(n++)] = {static_cast<std::int16_t>(key), static_cast<std::int16_t>(channel), controller};
    b.monoHeldCount = n;
  }
  if (!poly && b.monoVoice >= 0) { v = b.monoVoice; trigger = false; }
  else if (!poly && controller != 0 && b.lastMonoVoice >= 0 && b.lastMonoVoice < b.voiceCount &&
           !b.voices[static_cast<std::size_t>(b.lastMonoVoice)].active && b.lastMonoOff >= 0 && sample_ - b.lastMonoOff <= sampleRate_ / 4) {
    // Mono, a key pressed within 250 ms of letting go of the last one (keys played quickly rarely overlap): play the
    // envelope again and glide from the last pitch, instead of starting cold on the new one (owner review 3).
    v = b.monoVoice = b.lastMonoVoice;
    fromRelease = true;
  } else {
    v = freeVoice();
    if (v < 0) { v = oldestActive(); trigger = false; }
    if (v < 0) return;
    if (!poly) b.monoVoice = v;
  }
  if (!poly) b.lastMonoVoice = v;
  Voice& vo = b.voices[static_cast<std::size_t>(v)];
  vo.key = key; vo.controller = controller; vo.offset = offset;
  // A new note starts with neutral expression (PLUGIN-0004); its controller sends any initial values right after.
  vo.channel = channel; vo.bend = 0.0; vo.exprGain = vo.gainNow = vo.pressureFloor = 1.0; vo.lpA = 1.0; vo.trigTick = tick_; vo.slide = -1.0;
  if (!vo.active) { vo.active = true; vo.activeAt = ++b.voiceClock; }
  int active = 0;
  for (int i = 0; i < b.voiceCount; ++i) active += b.voices[static_cast<std::size_t>(i)].active ? 1 : 0;
  if ((trigger && !fromRelease) || active > 1) glide = 0.0;
  setPitch(slot, v, glide);
  if (trigger) {
    b.envFromChain = envFromChain;
    vo.env.configure(envFromChain ? envelopeFor(slot) : dsp::Envelope::Settings{}, sampleRate_);
    vo.env.gateOn();
    if (isSampler(b.type)) { vo.playhead = b.params[P::SourceSample::startPosition] * b.sampleRate; vo.samplePlaying = b.sampleFrames > 0; }
    log(Event::Type::GateOn, b.id);
  }
  updateNotePower(b);
}

/// v1 Source.NoteOff + RemoveVoice: the voice playing this key for this controller is released, unless it is the
/// mono voice of a powered source (then power takes it back at the default note).
void Engine::voiceOff(int slot, BlockId controller, int key, int channel) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  int n = 0;
  for (int i = 0; i < b.monoHeldCount; ++i) {
    const auto& h = b.monoHeld[static_cast<std::size_t>(i)];
    if (h.key != key || h.controller != controller || h.channel != channel) b.monoHeld[static_cast<std::size_t>(n++)] = h;
  }
  b.monoHeldCount = n;
  for (int v = 0; v < kVoices; ++v) {
    Voice& vo = b.voices[static_cast<std::size_t>(v)];
    if (!vo.active || vo.key != key || vo.controller != controller || vo.channel != channel) continue;
    if (v == b.monoVoice) {
      // Mono: back to the newest key still held, gliding (owner review 3; v1 released here).
      if (b.monoHeldCount > 0) {
        const auto h = b.monoHeld[static_cast<std::size_t>(b.monoHeldCount - 1)];
        const int c = slotOf(h.controller);
        vo.key = h.key; vo.controller = h.controller; vo.channel = h.channel; vo.bend = 0.0;
        setPitch(slot, v, c >= 0 ? std::max(0.0, blocks_[static_cast<std::size_t>(c)].params[P::InputComputerKeyboard::glide]) : 0.0);
        continue;
      }
      if (b.sourcePower() > 0 && controller != 0) { vo.controller = 0; vo.key = -1; setPitch(slot, v, 0.0); continue; }
      b.monoVoice = -1;
      b.lastMonoOff = sample_;
    }
    releaseVoice(slot, v);
  }
  updateNotePower(b);
}

void Engine::releaseVoice(int slot, int v) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  Voice& vo = b.voices[static_cast<std::size_t>(v)];
  vo.active = false; vo.freedAt = ++b.voiceClock;
  vo.env.gateOff();
  log(Event::Type::GateOff, b.id);
}

// ---------------------------------------------------------------------------------------------------------------
// arranged sources (CHG-0017, AUDIO-0002): note effects and Keys set pitch
// ---------------------------------------------------------------------------------------------------------------

namespace {
/// Scales shared by Random Note and the Touchpad: major, minor, dorian, lydian, mixolydian, pentatonic.
constexpr int kScaleCount = 6;
constexpr int kScaleSize[kScaleCount] = {7, 7, 7, 7, 7, 5};
constexpr int kScales[kScaleCount][7] = {
  {0, 2, 4, 5, 7, 9, 11}, {0, 2, 3, 5, 7, 8, 10}, {0, 2, 3, 5, 7, 9, 10}, {0, 2, 4, 6, 7, 9, 11}, {0, 2, 4, 5, 7, 9, 10}, {0, 2, 4, 7, 9, 0, 0}};
/// Chord: octave, fifth, major, minor, sus2, sus4, seventh, major 7th, minor 7th.
constexpr int kChordCount = 8;
constexpr int kChordSize[kChordCount] = {2, 3, 3, 3, 3, 4, 4, 4};
constexpr int kChords[kChordCount][4] = {{0, 7, 0, 0}, {0, 4, 7, 0}, {0, 3, 7, 0}, {0, 2, 7, 0}, {0, 5, 7, 0}, {0, 4, 7, 10}, {0, 4, 7, 11}, {0, 3, 7, 10}};
}  // namespace

bool Engine::keysSetPitch(const Block& ctrl) noexcept {
  if (ctrl.type == BlockType::InputComputerKeyboard) return ctrl.params[P::InputComputerKeyboard::keysSetPitch] != 0.0;
  if (ctrl.type == BlockType::InputMidiController) return ctrl.params[P::InputMidiController::keysSetPitch] != 0.0;
  if (ctrl.type == BlockType::InputTouchpad) return ctrl.params[P::InputTouchpad::keysSetPitch] != 0.0;
  return false;
}

/// The note effects in a source's chain (the last of each kind in chain order, as the Envelope).
Engine::NoteFx Engine::noteFxFor(int slot) const noexcept {
  NoteFx fx;
  const int c = chains_.chainOf[static_cast<std::size_t>(slot)];
  if (c < 0) return fx;
  const auto r = chains_.chains[static_cast<std::size_t>(c)];
  for (int m = 0; m < r.count; ++m) {
    const int s = chains_.members[r.start + m];
    const BlockType t = blocks_[static_cast<std::size_t>(s)].type;
    if (t == BlockType::FxRandomNote) fx.random = s; else if (t == BlockType::FxChord) fx.chord = s; else if (t == BlockType::FxArpeggiator) fx.arp = s;
  }
  return fx;
}

/// A source is arranged while a note effect is in its chain or a connected keyboard has Keys set pitch on. Otherwise
/// v1's voice rules apply untouched.
bool Engine::wantsArranged(int slot) const noexcept {
  const NoteFx fx = noteFxFor(slot);
  if (fx.random >= 0 || fx.chord >= 0 || fx.arp >= 0) return true;
  const auto& row = graph_.row(slot);
  for (int k = 0; k < orderCount_; ++k) if (row[order_[k]] && blocks_[order_[k]].kind() == BlockKind::Controller && keysSetPitch(blocks_[order_[k]])) return true;
  return false;
}

/// A controller's key on an arranged source: it joins or leaves the held keys; pressing a sounding key is a trigger.
void Engine::arrangedKey(int slot, const Block& ctrl, int key, int channel, bool on) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  int n = 0;
  for (int i = 0; i < b.arrKeyCount; ++i) {
    const auto& h = b.arrKeys[static_cast<std::size_t>(i)];
    if (h.key != key || h.controller != ctrl.id || h.channel != channel) b.arrKeys[static_cast<std::size_t>(n++)] = h;
  }
  const bool pitchOnly = keysSetPitch(ctrl);
  if (on) {
    if (n == static_cast<int>(b.arrKeys.size())) { std::copy(b.arrKeys.begin() + 1, b.arrKeys.end(), b.arrKeys.begin()); --n; }
    b.arrKeys[static_cast<std::size_t>(n++)] = {static_cast<std::int16_t>(key), static_cast<std::int16_t>(channel), ctrl.id, pitchOnly, polyOf(ctrl)};
  }
  b.arrKeyCount = n;
  arrange(slot, on && !pitchOnly);
  updateNotePower(b);
}

/// Work out the notes an arranged source should be sounding and make its voices match (AUDIO-0002).
/// Notes in: the keys held on its keyboards (a mono keyboard that sounds counts only its newest; with Keys set pitch
/// every held key counts), or, with none, the source's own note. They sound while the source has power or a sounding
/// key is held. Then Random Note picks one per trigger, Chord adds its intervals, and an Arpeggiator plays one at a
/// time. `trigger`: power arrived, or a sounding key was pressed.
void Engine::arrange(int slot, bool trigger) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  using Note = Block::ArrNote;
  bool soundingKey = false;
  for (int i = 0; i < b.arrKeyCount; ++i) soundingKey = soundingKey || !b.arrKeys[static_cast<std::size_t>(i)].pitchOnly;
  const bool gate = b.powerOn || soundingKey;
  const bool started = gate && !b.arrGate;
  b.arrGate = gate;
  if (!gate) {
    for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) releaseVoice(slot, v);
    b.randomValid = false;
    return;
  }
  const NoteFx fx = noteFxFor(slot);
  std::array<Note, 64> notes;
  int n = 0;
  for (int i = 0; i < b.arrKeyCount; ++i) {
    const auto& h = b.arrKeys[static_cast<std::size_t>(i)];
    if (!h.pitchOnly && !h.poly) {  // a sounding mono keyboard: only its newest key
      bool newer = false;
      for (int j = i + 1; j < b.arrKeyCount; ++j) newer = newer || (b.arrKeys[static_cast<std::size_t>(j)].controller == h.controller && !b.arrKeys[static_cast<std::size_t>(j)].pitchOnly);
      if (newer) continue;
    }
    notes[static_cast<std::size_t>(n++)] = Note{h.controller, h.key, h.channel, 0.0, h.bend};
  }
  const bool fromKeys = n > 0;
  if (!fromKeys) notes[static_cast<std::size_t>(n++)] = Note{};  // the source's own note
  if (fx.random >= 0) {
    if (trigger || !b.randomValid) {
      Block& rn = blocks_[static_cast<std::size_t>(fx.random)];
      if (fromKeys) b.randomNote = notes[static_cast<std::size_t>(rn.grainRng.next() % static_cast<std::uint32_t>(n))];
      else {
        const int scale = std::clamp(static_cast<int>(std::lround(rn.params[P::FxRandomNote::scale])), 0, kScaleCount - 1);
        const int root = std::clamp(static_cast<int>(std::lround(rn.params[P::FxRandomNote::key])), 0, 11);
        int lo = std::clamp(static_cast<int>(std::lround(rn.params[P::FxRandomNote::low])), -3, 3), hi = std::clamp(static_cast<int>(std::lround(rn.params[P::FxRandomNote::high])), -3, 3);
        if (hi < lo) std::swap(lo, hi);
        const int size = kScaleSize[scale], count = (hi - lo + 1) * size;
        const int pick = static_cast<int>(rn.grainRng.next() % static_cast<std::uint32_t>(count));
        b.randomNote = Note{0, static_cast<std::int16_t>(60 + root + 12 * (lo + pick / size) + kScales[scale][pick % size]), 0, 0.0};
      }
      b.randomValid = true;
    }
    notes[0] = b.randomNote; n = 1;
  }
  if (fx.chord >= 0) {
    const Block& ch = blocks_[static_cast<std::size_t>(fx.chord)];
    const int type = std::clamp(static_cast<int>(std::lround(ch.params[P::FxChord::chord])), 0, kChordCount - 1), size = kChordSize[type];
    const int inv = std::clamp(static_cast<int>(std::lround(ch.params[P::FxChord::inversion])), 0, size - 1);
    const int in = n;
    std::array<Note, 64> out;
    int m = 0;
    for (int i = 0; i < in; ++i) for (int k = 0; k < size && m < static_cast<int>(out.size()); ++k) {
      Note x = notes[static_cast<std::size_t>(i)];
      x.offset += kChords[type][k] + (k < inv ? 12 : 0);
      out[static_cast<std::size_t>(m++)] = x;
    }
    notes = out; n = m;
  }
  const auto pitchOf = [](const Note& x) { return (x.key >= 0 ? x.key : 60) + x.offset + x.bend; };
  if (fx.arp >= 0) {
    Block& ar = blocks_[static_cast<std::size_t>(fx.arp)];
    const bool perHit = ar.params[P::FxArpeggiator::perHit] != 0.0;
    // Timed: a fresh start begins at its first note, on the beat it is in. Per hit: every trigger is the next note.
    // While it runs on its own, keys and hits change the notes but not where it is.
    const bool advance = perHit ? trigger : arpTick_;
    if (started && !perHit) { b.arpStep = 0; b.arpTicks = -1;  /* this tick's stepArps makes it 0 */ b.arpRand = ar.grainRng.next(); b.arpSlot = static_cast<std::int64_t>(std::floor(beat_ / std::max(1.0 / 64.0, ar.params[P::FxArpeggiator::division]) + 1e-9)); }
    else if (advance) { ++b.arpStep; b.arpRand = ar.grainRng.next(); }
    std::sort(notes.begin(), notes.begin() + n, [&](const Note& x, const Note& y) { return pitchOf(x) < pitchOf(y); });
    const int octaves = std::clamp(static_cast<int>(std::lround(ar.params[P::FxArpeggiator::octaves])), 1, 3);
    const int base = n;
    for (int o = 1; o < octaves; ++o) for (int i = 0; i < base && n < static_cast<int>(notes.size()); ++i) {
      Note x = notes[static_cast<std::size_t>(i)]; x.offset += 12.0 * o; notes[static_cast<std::size_t>(n++)] = x;
    }
    const int pattern = std::clamp(static_cast<int>(std::lround(ar.params[P::FxArpeggiator::pattern])), 0, 3);
    const int step = std::max(0, b.arpStep);
    int at = step % n;
    if (pattern == 1) at = n - 1 - at;
    else if (pattern == 2 && n > 1) { const int p = step % (2 * n - 2); at = p < n ? p : 2 * n - 2 - p; }
    else if (pattern == 3) at = static_cast<int>(b.arpRand % static_cast<std::uint32_t>(n));
    notes[0] = notes[static_cast<std::size_t>(at)]; n = 1;
    if (advance) for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) releaseVoice(slot, v);  // each step is struck again
  }
  n = std::min(n, b.voiceCount);
  // Voices no longer wanted let go; notes not yet sounding start. Notes that stay keep sounding as they are.
  const auto same = [](const Voice& vo, const Note& x) { return vo.controller == x.controller && vo.key == x.key && vo.channel == x.channel && vo.offset == x.offset; };
  for (int v = 0; v < kVoices; ++v) {
    const Voice& vo = b.voices[static_cast<std::size_t>(v)];
    if (!vo.active) continue;
    bool wanted = false;
    for (int i = 0; i < n && !wanted; ++i) wanted = same(vo, notes[static_cast<std::size_t>(i)]);
    if (!wanted) releaseVoice(slot, v);
  }
  // v1's rule for the envelope: a source held by a Power block alone plays the default one (R10b).
  const bool envFromChain = soundingKey || b.staticPower == 0;
  for (int i = 0; i < n; ++i) {
    const Note& x = notes[static_cast<std::size_t>(i)];
    bool sounding = false;
    for (int v = 0; v < kVoices && !sounding; ++v) sounding = b.voices[static_cast<std::size_t>(v)].active && same(b.voices[static_cast<std::size_t>(v)], x);
    if (!sounding) voiceOn(slot, x.controller, x.key, true, 0.0, envFromChain, x.channel, x.offset);
    // A held key slid (a bend): its notes follow it, sounding or just struck (no new attack for a slide).
    for (int v = 0; v < kVoices; ++v) {
      Voice& vo = b.voices[static_cast<std::size_t>(v)];
      if (vo.active && same(vo, x) && vo.bend != x.bend) { vo.bend = x.bend; setPitch(slot, v, 0.0); }
    }
  }
  updateNotePower(b);
}

namespace {
/// A param's value on its slider (0–1 along it) and back, by the manifest's v1 slider mapping (as mapAutomation).
bool toSlider(const gen::ParamInfo& p, double value, double& out) noexcept {
  double ui = 0.0;
  switch (p.transform) {
    case gen::UiTransform::Identity: ui = value; break;
    case gen::UiTransform::SubtractFrom: ui = p.k - value; break;
    case gen::UiTransform::Minus: ui = value + p.k; break;
    case gen::UiTransform::Divide: ui = value * p.k; break;
    case gen::UiTransform::None: return false;
  }
  if (!(p.uiMax > p.uiMin)) return false;
  if (p.log && p.uiMin > 0.0) out = dmath::log2(std::max(ui, p.uiMin) / p.uiMin) / dmath::log2(p.uiMax / p.uiMin);
  else out = (ui - p.uiMin) / (p.uiMax - p.uiMin);
  return true;
}
double fromSlider(const gen::ParamInfo& p, double t) noexcept {
  const double ui = p.log && p.uiMin > 0.0 ? p.uiMin * dmath::exp2(t * dmath::log2(p.uiMax / p.uiMin)) : p.uiMin + t * (p.uiMax - p.uiMin);
  switch (p.transform) {
    case gen::UiTransform::SubtractFrom: return p.k - ui;
    case gen::UiTransform::Minus: return ui - p.k;
    case gen::UiTransform::Divide: return ui / p.k;
    default: return ui;
  }
}
/// One cycle of an LFO shape at phase x (0–1), in −1…1: sine, square, triangle, saw (the Tone's waveform order).
double lfoShape(int shape, double x) noexcept {
  x -= std::floor(x);
  switch (shape) {
    case 1: return x < 0.5 ? 1.0 : -1.0;
    case 2: return x < 0.25 ? 4.0 * x : x < 0.75 ? 2.0 - 4.0 * x : 4.0 * x - 4.0;
    case 3: return 2.0 * x - 1.0;
    default: return dmath::sin(2.0 * dmath::kPi * x);
  }
}
}  // namespace

/// A param changed under the engine's own hand (an LFO): what SetParam does after storing the value.
void Engine::paramChanged(int slot, std::uint8_t param) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  if (b.type == BlockType::PowerLaser && param == P::PowerLaser::angle) b.laserAngle0 = b.params[param];
  b.lastParam = param;
  configureDsp(b);
  b.lastParam = 255;
  if (b.type == BlockType::PowerToggle) recomputeStaticPower();
}

/// LFOs (CHG-0018, AUDIO-0003). Each moves one param of one block connected to it, on that param's slider: the
/// value the slider is set to (the base) plus depth × shape × half the slider's range. Several on one param add;
/// the sum stops at the slider's ends, except angles, which wrap. A param no LFO moves any more goes back to its base.
void Engine::runModulators() noexcept {
  struct Target { int slot; std::uint8_t param; double sum; };
  std::array<Target, 64> targets;
  int n = 0;
  for (int k = 0; k < orderCount_; ++k) {
    Block& l = blocks_[order_[k]];
    if (l.type != BlockType::FxLfo) continue;
    const auto& p = l.params;
    // Its place in the cycle: the beat when synced, its own clock when not.
    const double phase = p[P::FxLfo::sync] != 0.0 ? beat_ / std::max(1.0 / 16.0, p[P::FxLfo::division]) : l.lfoPhase;
    if (p[P::FxLfo::sync] == 0.0) { l.lfoPhase += std::clamp(p[P::FxLfo::rate], 0.001, 100.0) / kTickRate; l.lfoPhase -= std::floor(l.lfoPhase); }
    const double value = lfoShape(std::clamp(static_cast<int>(std::lround(p[P::FxLfo::shape])), 0, 3), phase + p[P::FxLfo::phase]) * std::clamp(p[P::FxLfo::depth], 0.0, 1.0);
    l.mon[0] = 0.0f;
    const int ts = slotOf(static_cast<BlockId>(std::max(0.0, p[P::FxLfo::targetBlock])));
    if (ts < 0 || ts == order_[k] || !graph_.connected(order_[k], ts)) continue;  // idle until its target is connected
    const Block& t = blocks_[static_cast<std::size_t>(ts)];
    const int param = static_cast<int>(std::lround(p[P::FxLfo::targetParam]));
    double unused;
    if (param < 0 || param >= t.info().paramCount || param >= 32 || !toSlider(t.info().params[param], 0.0, unused)) continue;
    l.mon[0] = static_cast<float>(t.id); l.mon[1] = static_cast<float>(param);
    int at = 0;
    while (at < n && (targets[static_cast<std::size_t>(at)].slot != ts || targets[static_cast<std::size_t>(at)].param != param)) ++at;
    if (at == n) { if (n == static_cast<int>(targets.size())) continue; targets[static_cast<std::size_t>(n++)] = {ts, static_cast<std::uint8_t>(param), 0.0}; }
    targets[static_cast<std::size_t>(at)].sum += value * 0.5;  // depth 1 swings across the whole slider
  }
  // Params no longer moved go back to where they are set.
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if (!b.modMask) continue;
    for (std::uint8_t q = 0; q < b.info().paramCount && q < 32; ++q) {
      if (!(b.modMask & (1u << q))) continue;
      bool still = false;
      for (int i = 0; i < n && !still; ++i) still = targets[static_cast<std::size_t>(i)].slot == order_[k] && targets[static_cast<std::size_t>(i)].param == q;
      if (still) continue;
      b.modMask &= ~(1u << q);
      b.params[q] = b.modBase[q];
      paramChanged(order_[k], q);
    }
  }
  for (int i = 0; i < n; ++i) {
    const Target& tg = targets[static_cast<std::size_t>(i)];
    Block& b = blocks_[static_cast<std::size_t>(tg.slot)];
    const auto& info = b.info().params[tg.param];
    if (!(b.modMask & (1u << tg.param))) { b.modMask |= 1u << tg.param; b.modBase[tg.param] = b.params[tg.param]; }
    double base = 0.0;
    toSlider(info, b.modBase[tg.param], base);
    double x = base + tg.sum;
    if (info.key == "angle") x -= std::floor(x);  // angles go round
    else x = std::clamp(x, 0.0, 1.0);
    const double v = fromSlider(info, x);
    if (v != b.params[tg.param]) { b.params[tg.param] = v; paramChanged(tg.slot, tg.param); }
  }
  // Each LFO reports its target's value now (the open panel's slider follows it).
  for (int k = 0; k < orderCount_; ++k) {
    Block& l = blocks_[order_[k]];
    if (l.type != BlockType::FxLfo || l.mon[0] == 0.0f) continue;
    const int ts = slotOf(static_cast<BlockId>(l.mon[0]));
    if (ts >= 0) l.mon[2] = static_cast<float>(blocks_[static_cast<std::size_t>(ts)].params[static_cast<std::size_t>(l.mon[1])]);
  }
}

/// Timed Arpeggiators move on: every `division` beats when synced, `speed` times a second when not.
void Engine::stepArps() noexcept {
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if (!b.arranged || !b.arrGate) continue;
    const NoteFx fx = noteFxFor(order_[k]);
    if (fx.arp < 0) continue;
    const Block& ar = blocks_[static_cast<std::size_t>(fx.arp)];
    if (ar.params[P::FxArpeggiator::perHit] != 0.0) continue;
    bool step = false;
    if (ar.params[P::FxArpeggiator::sync] != 0.0) {
      const auto slot = static_cast<std::int64_t>(std::floor(beat_ / std::max(1.0 / 64.0, ar.params[P::FxArpeggiator::division]) + 1e-9));
      step = slot != b.arpSlot;
      b.arpSlot = slot;
    } else {
      const int every = std::max(1, static_cast<int>(std::lround(kTickRate / std::clamp(ar.params[P::FxArpeggiator::speed], 0.25, 60.0))));
      if (++b.arpTicks >= every) { b.arpTicks = 0; step = true; }
    }
    if (step) { arpTick_ = true; arrange(order_[k], false); arpTick_ = false; }
  }
}

void Engine::updateNotePower(Block& b) noexcept {
  b.notePower = 0;
  for (const auto& vo : b.voices) if (vo.active && vo.controller != 0) b.notePower = 1;
}

/// v1 Controller.GetPitchMods summed over connected controllers: transposition (12 × octaves).
double Engine::controllerMods(int slot) const noexcept {
  double m = 0.0;
  const auto& row = graph_.row(slot);
  for (int k = 0; k < orderCount_; ++k)
    if (row[order_[k]] && blocks_[order_[k]].kind() == BlockKind::Controller) m += 12.0 * static_cast<double>(std::lround(blocks_[order_[k]].params[0]));  // param 0 = transpose
  return m;
}

/// v1 Source.SetPitch: frequency (oscillators) or playback rate (samplers), linearly ramped over `glide` seconds.
void Engine::setPitch(int slot, int v, double glide) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  Voice& vo = b.voices[static_cast<std::size_t>(v)];
  const auto& p = b.params;
  double target = 0.0;
  if (b.type == BlockType::SourceTone) {
    const double semis = p[P::SourceTone::transpose] + p[P::SourceTone::fine];
    // Power plays v1 Config.BaseNote; a controller key is midiToFrequency(key + controller mods + source mods).
    target = vo.key >= 0 ? 440.0 * dmath::exp2((vo.key + controllerMods(slot) + semis + vo.bend - 69.0) / 12.0) : kBaseNoteHz * dmath::exp2(semis / 12.0);
    if (vo.offset != 0.0) target *= dmath::exp2(vo.offset / 12.0);  // CHG-0017: a Chord's interval, an Arpeggiator's octave
  } else if (isSampler(b.type) || b.type == BlockType::SourceGranular) {  // Granular's playbackRate/detune line up
    // playbackRate = 2^((note − DefaultNote + playbackRate + detune) / 12) × buffer/engine rate (AudioBufferSourceNode).
    const double semis = p[P::SourceSample::playbackRate] + p[P::SourceSample::detune] + (vo.key >= 0 ? vo.key + controllerMods(slot) + vo.bend - 60.0 : 0.0);
    target = dmath::exp2((semis + vo.offset) / 12.0) * (b.sampleRate / sampleRate_);
  } else return;
  const int n = static_cast<int>(std::lround(glide * sampleRate_));
  if (n > 0 && vo.pitch > 0.0) { vo.glideTo = target; vo.glideLeft = n; vo.glideStep = (target - vo.pitch) / n; }
  else { vo.pitch = target; vo.glideLeft = 0; applyPitch(b, vo); }
}

void Engine::applyPitch(Block& b, Voice& vo) noexcept {
  if (b.type == BlockType::SourceTone) vo.osc.setFrequency(vo.pitch, *wavetables_);
}

/// After the topology or a controller changes: voice count follows the connected controllers' polyphony (v1
/// CreateVoices / RemoveExtraVoices), voices of disconnected controllers are released (DeactivateDisconnectedVoices),
/// and active voices are re-pitched (NoteUpdate).
void Engine::refreshVoices(int slot) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  if (b.kind() != BlockKind::AudioSource) return;
  const auto& row = graph_.row(slot);
  bool poly = false;
  for (int k = 0; k < orderCount_; ++k) if (row[order_[k]] && blocks_[order_[k]].kind() == BlockKind::Controller && polyOf(blocks_[order_[k]])) poly = true;
  // CHG-0017: arranged or not. Changing over starts clean: every voice let go, held keys forgotten.
  if (const bool arr = wantsArranged(slot); arr != b.arranged) {
    for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) releaseVoice(slot, v);
    b.monoVoice = b.lastMonoVoice = -1; b.monoHeldCount = 0; b.arrKeyCount = 0; b.randomValid = false; b.arrGate = false;
    b.powerOn = false;  // power takes the source again on the next gate update
    b.arranged = arr;
  }
  if (b.arranged) {
    b.voiceCount = b.type == BlockType::SourceGranular ? 1 : kVoices;
    int n = 0;
    for (int i = 0; i < b.arrKeyCount; ++i) {  // keys of controllers no longer connected are gone; the rest follow their controller's switches
      auto h = b.arrKeys[static_cast<std::size_t>(i)];
      const int c = slotOf(h.controller);
      if (c < 0 || !row[static_cast<std::size_t>(c)]) continue;
      h.pitchOnly = keysSetPitch(blocks_[static_cast<std::size_t>(c)]); h.poly = polyOf(blocks_[static_cast<std::size_t>(c)]);
      b.arrKeys[static_cast<std::size_t>(n++)] = h;
    }
    b.arrKeyCount = n;
    arrange(slot, false);
    for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) setPitch(slot, v, 0.0);
    updateNotePower(b);
    return;
  }
  const int want = poly && b.type != BlockType::SourceGranular ? kVoices : 1;
  if (want != b.voiceCount) {
    if (want < b.voiceCount) {  // RemoveExtraVoices: everything released, back to one free voice
      for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) releaseVoice(slot, v);
      b.monoVoice = b.lastMonoVoice = -1;
      b.monoHeldCount = 0;
      if (b.powerOn) b.powerOn = false;  // power re-takes the voice on the next gate update
    }
    b.voiceCount = want;
  }
  {  // held mono keys of controllers no longer connected are gone
    int n = 0;
    for (int i = 0; i < b.monoHeldCount; ++i) {
      const auto h = b.monoHeld[static_cast<std::size_t>(i)];
      bool connected = false;
      for (int k = 0; k < orderCount_; ++k) if (row[order_[k]] && blocks_[order_[k]].id == h.controller) connected = true;
      if (connected) b.monoHeld[static_cast<std::size_t>(n++)] = h;
    }
    b.monoHeldCount = n;
  }
  for (int v = 0; v < kVoices; ++v) {
    Voice& vo = b.voices[static_cast<std::size_t>(v)];
    if (!vo.active || vo.controller == 0) continue;
    bool connected = false;
    for (int k = 0; k < orderCount_; ++k) if (row[order_[k]] && blocks_[order_[k]].id == vo.controller) connected = true;
    if (connected) continue;
    if (v == b.monoVoice) {
      if (b.sourcePower() > 0) { vo.controller = 0; vo.key = -1; setPitch(slot, v, 0.0); continue; }
      b.monoVoice = -1;
    }
    releaseVoice(slot, v);
  }
  for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) setPitch(slot, v, 0.0);
  updateNotePower(b);
}

int Engine::connections(std::uint32_t* pairs, int maxPairs) const noexcept {
  int n = 0;
  const int cap = std::min(maxPairs, static_cast<int>(pairScratch_.size()));
  for (int i = 0; i < kMaxBlocks && n < cap; ++i) {
    if (!blocks_[i].alive) continue;
    const auto& row = graph_.row(i);
    for (int j = i + 1; j < kMaxBlocks && n < cap; ++j)
      if (row[static_cast<std::size_t>(j)]) pairScratch_[static_cast<std::size_t>(n++)] = {graph_.since(i, j), static_cast<std::uint16_t>(i), static_cast<std::uint16_t>(j)};
  }
  std::sort(pairScratch_.begin(), pairScratch_.begin() + n, [](const PairAge& x, const PairAge& y) { return x.since < y.since; });
  for (int k = 0; k < n; ++k) {
    const auto& p = pairScratch_[static_cast<std::size_t>(k)];
    pairs[k * 2] = blocks_[p.a].id; pairs[k * 2 + 1] = blocks_[p.b].id;
  }
  return n;
}

void Engine::onTopologyChanged(int slot, const ConnectionGraph::Row& before) noexcept {
  const auto& after = graph_.row(slot);
  const BlockId self = blocks_[slot].id;
  for (int k = 0; k < orderCount_; ++k) {  // log in creation order for deterministic event streams
    const int j = order_[k];
    if (before[j] != after[j]) log(after[j] ? Event::Type::Connect : Event::Type::Disconnect, self, blocks_[j].id);
  }
  chains_.rebuild(blocks_, graph_, order_, orderCount_);
  routingDirty_ = true;
  recomputeStaticPower();
  for (int k = 0; k < orderCount_; ++k) refreshVoices(order_[k]);
  releaseStageNotes();
}

void Engine::recomputeStaticPower() noexcept {
  for (int k = 0; k < orderCount_; ++k) blocks_[order_[k]].staticPower = 0;
  if (!worldPower_) return;
  for (int k = 0; k < orderCount_; ++k) {
    const Block& p = blocks_[order_[k]];
    const bool powers = (p.type == BlockType::PowerPower && p.gapUntil == 0) ||  // not while a hit cuts it
                        (p.type == BlockType::PowerToggle && p.params[P::PowerToggle::logic] != 0.0);
    if (!powers) continue;
    const auto& row = graph_.row(order_[k]);
    for (int i = 0; i < orderCount_; ++i) {
      const int s = order_[i];
      if (row[s] && isSourceSide(blocks_[s].kind())) blocks_[s].staticPower++;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// simulation (SPEC-SIMULATION-POWER-AND-PARTICLES)
// ---------------------------------------------------------------------------------------------------------------

void Engine::pulse(Block& b, int ticks) noexcept {
  if (b.pulsePower >= kMaxPulsesPerBlock) return;
  b.pulseEndTick[b.pulsePower++] = tick_ + static_cast<std::uint32_t>(std::max(1, ticks));
}

void Engine::emit(Block& e) noexcept { emit(e, e.params[P::PowerEmitter::angle]); }

void Engine::emit(Block& e, double angleDeg) noexcept {
  if (particleCount_ >= kMaxParticles) return;
  const double angle = angleDeg * kDegToRad;
  const double speed = e.params[P::PowerEmitter::speed];  // v1 units per frame
  const double range = e.params[P::PowerEmitter::range];  // v1 units
  const double perTick = speed / kV1UnitsPerGrid / kTicksPerV1Frame;  // grid units per tick
  Particle& p = particles_[particleCount_++];
  p.x = e.x; p.y = e.y;
  p.vx = dmath::cos(angle) * perTick; p.vy = dmath::sin(angle) * perTick;
  p.life = static_cast<int>(std::lround(range / speed)) * kTicksPerV1Frame;
  p.size = 2.0f + rng_.nextFloat();
  p.fresh = true;
  log(Event::Type::Emit, e.id);
}

void Engine::particleHit(Block& b) noexcept {
  if (b.kind() == BlockKind::Logic) { logicHit(b); return; }
  // SIMULATION-0008 (owner, 2026-11-14; v1 only lengthened the note): a hit on a source that only earlier hits are
  // holding strikes it again, so fast particles play every note (a new Random Note pick each time).
  if (b.kind() == BlockKind::AudioSource && b.powerOn && b.staticPower == 0 && b.laserPower == 0 && b.pressPower == 0) b.restrike = true;
  pulse(b, kPulseTicks);  // sources (incl. lasers) get a momentary pulse of power
}

/// Strike a pulse-held source again (SIMULATION-0008): the power voice's envelope starts over (a sampler from its
/// start); an arranged source lets its notes go and plays them as a new trigger.
void Engine::restrike(int slot) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  if (b.type == BlockType::SourceStage) return;
  if (b.arranged) {
    for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) releaseVoice(slot, v);
    arrange(slot, true);
    return;
  }
  if (b.monoVoice < 0) return;
  Voice& vo = b.voices[static_cast<std::size_t>(b.monoVoice)];
  if (!vo.active || vo.controller != 0) return;  // a key has the voice: power only keeps it
  b.envFromChain = true;
  vo.env.configure(envelopeFor(slot), sampleRate_);
  vo.env.gateOn();
  vo.trigTick = tick_;
  if (isSampler(b.type)) { vo.playhead = b.params[P::SourceSample::startPosition] * b.sampleRate; vo.samplePlaying = b.sampleFrames > 0; }
  log(Event::Type::GateOn, b.id);
}

/// A Power with Gap on hit (owner, 2026-11-14): a Power that hits cut, rather than pass through.
bool Engine::gapsOnHit(const Block& b) noexcept { return b.type == BlockType::PowerPower && b.params[P::PowerPower::gapOnHit] != 0.0; }

/// A hit on a Power with Gap on hit: no power from it for `gap` (at least a tick), so its sources let go and are struck
/// again when it comes back. A hit during a gap starts the gap over.
void Engine::powerGap(Block& b) noexcept {
  log(Event::Type::Logic, b.id);
  b.gapUntil = tick_ + static_cast<std::uint32_t>(std::max(1L, std::lround(std::clamp(b.params[P::PowerPower::gap], 0.0, 10.0) * kTickRate)));
  recomputeStaticPower();
}

void Engine::logicHit(Block& b) noexcept {
  if (b.type == BlockType::PowerToggle) {
    b.params[P::PowerToggle::logic] = b.params[P::PowerToggle::logic] != 0.0 ? 0.0 : 1.0;
    log(Event::Type::Logic, b.id);
    recomputeStaticPower();
    return;
  }
  if (b.type == BlockType::PowerPulse) {
    log(Event::Type::Logic, b.id);
    const auto& row = graph_.row(slotOf(b.id));
    // v1 Pulse: each hit powers the connected sources for `pulseLength` s (its slider); synced, `pulseBeats` at the
    // current tempo (CHG-0004 3.5).
    const int ticks = static_cast<int>(std::lround((b.params[P::PowerPulse::sync] != 0.0
      ? b.params[P::PowerPulse::pulseBeats] * 60.0 / tempo_ : b.params[P::PowerPulse::pulseLength]) * kTickRate));
    for (int k = 0; k < orderCount_; ++k) {
      Block& s = blocks_[order_[k]];
      if (row[order_[k]] && isSourceSide(s.kind())) pulse(s, ticks);
    }
  }
}

void Engine::releaseLaser(Block& laser) noexcept {
  for (int k = 0; k < orderCount_; ++k) {
    Block& t = blocks_[order_[k]];
    if (laser.laserHits[static_cast<std::size_t>(order_[k])] && t.kind() != BlockKind::Logic && t.laserPower > 0) t.laserPower--;
  }
  laser.laserHits.reset();
  laser.gateHits.reset(); laser.gateOpen.reset();
  laser.beamOn = false;
}

static_assert(P::PowerSoundLaser::angle == P::PowerLaser::angle && P::PowerSoundLaser::range == P::PowerLaser::range,
              "the Sound Laser's beam params line up with the Laser's");

/// SPEC-SIMULATION R7–R10. Beams are recomputed every tick in creation order, so a laser powered by an earlier laser
/// this tick fires this tick. Unlike v1, the beam stops at the *nearest* Void before any block is tested.
void Engine::runLasers() noexcept {
  beamCount_ = 0;
  for (int k = 0; k < orderCount_; ++k) {
    Block& l = blocks_[order_[k]];
    const bool sound = l.type == BlockType::PowerSoundLaser;  // CHG-0016: its beam is gated by what it hears
    if (l.type != BlockType::PowerLaser && !sound) continue;
    const bool running = worldPower_ && (sound ? l.listenOn : l.params[P::PowerLaser::selfPoweredMode] != 0.0 || l.power() > 0);
    if (!running) { if (l.laserHits.any() || l.beamOn) releaseLaser(l); continue; }
    // v1 rotates only while *powered* (IsPowered: PowerAmount > 0), not when merely self-powered.
    const double rotate = sound ? 0.0 : l.params[P::PowerLaser::rotate];  // the Sound Laser does not turn (owner, 2026-11-14)
    const bool synced = !sound && l.params[P::PowerLaser::sync] != 0.0;
    if (synced) {
      // Synced (owner): one full turn every |turnBeats| (negative: anticlockwise), locked to the beat: at beat 0 it
      // points at the Angle set, so every take from the same position turns the same (owner review 2).
      const double tb = l.params[P::PowerLaser::turnBeats];
      double a = std::fmod(l.laserAngle0 + (tb < 0.0 ? -360.0 : 360.0) * beat_ / std::max(0.25, std::abs(tb)) + 270.0, 360.0);
      if (a <= 0.0) a += 360.0;
      l.params[P::PowerLaser::angle] = a - 270.0;
    } else if (l.power() > 0 && std::lround(rotate) != 0) {
      double a = l.params[P::PowerLaser::angle] + rotate / 100.0 / kTicksPerV1Frame;
      if (a > 90.0) a -= 360.0;
      if (a < -270.0) a += 360.0;
      l.params[P::PowerLaser::angle] = a;
    }
    const double len = l.params[P::PowerLaser::range] / kV1UnitsPerGrid;
    std::bitset<kMaxBlocks> hits, gates, open;
    double stop = 1.0;
    traceBeam(order_[k], l.params[P::PowerLaser::angle], len, hits, gates, open, stop);
    for (int i = 0; i < orderCount_; ++i) {  // newly hit, in creation order
      const int s = order_[i];
      if (!hits[static_cast<std::size_t>(s)] || l.laserHits[static_cast<std::size_t>(s)]) continue;
      Block& b = blocks_[s];
      log(Event::Type::Hit, b.id, l.id);
      if (gapsOnHit(b)) powerGap(b);  // once per beam arriving, as a logic block
      else if (b.kind() == BlockKind::Logic) logicHit(b); else b.laserPower++;
    }
    for (int i = 0; i < orderCount_; ++i) {  // no longer hit: release continuous power
      const int s = order_[i];
      if (l.laserHits[static_cast<std::size_t>(s)] && !hits[static_cast<std::size_t>(s)] && blocks_[s].kind() != BlockKind::Logic && blocks_[s].type != BlockType::PowerPower && blocks_[s].laserPower > 0) blocks_[s].laserPower--;
    }
    l.laserHits = hits;
    l.gateHits = gates; l.gateOpen = open;
    l.beamOn = true;
    l.beamLength = len * stop;
  }
}

/// A Counter or Chance decides about one arriving hit (SIMULATION-0005). Counter: the Euclidean pattern E(hits, steps),
/// read from `rotate`, one step per hit, unless its steps were set by hand (`pattern` ≥ 0, owner 2026-11-14). Chance: its own random stream (seeded by block id, as Granular's grains, so
/// the patch seed stays visual-only).
bool Engine::gateDecide(Block& g) noexcept {
  bool pass = true;
  if (g.type == BlockType::PowerCounter) {
    const int steps = std::clamp(static_cast<int>(std::lround(g.params[P::PowerCounter::steps])), 1, 16);
    const int hits = std::clamp(static_cast<int>(std::lround(g.params[P::PowerCounter::hits])), 0, steps);
    const int rotate = std::clamp(static_cast<int>(std::lround(g.params[P::PowerCounter::rotate])), 0, 15);
    const int at = (g.gateStep % steps + rotate) % steps;
    const long mask = std::lround(g.params[P::PowerCounter::pattern]);
    pass = mask >= 0 ? ((mask >> (g.gateStep % steps)) & 1) != 0 : (at * hits) % steps < hits;  // steps set by hand win
    g.gateStep = (g.gateStep % steps + 1) % steps;
  } else if (g.type == BlockType::PowerChance) {
    pass = static_cast<double>(g.grainRng.nextFloat()) < g.params[P::PowerChance::chance];
  }
  g.gatePassed = pass;
  return pass;
}

/// One laser's beams (SPEC-SIMULATION R7, R7a). A beam runs to the nearest thing that stops it: a Void, a Counter or
/// Chance that is closed to it, or a Prism, where it carries on as the Prism's streams with the length it has left
/// (SIMULATION-0006). Every source and logic block a beam crosses before that is hit. Never through the same Prism
/// twice on one path, nor through more than kMaxPrismDepth; at most kMaxBeamSegments beams per laser.
void Engine::traceBeam(int laserSlot, double angleDeg, double len, std::bitset<kMaxBlocks>& hits, std::bitset<kMaxBlocks>& gates,
                       std::bitset<kMaxBlocks>& open, double& firstStop) noexcept {
  struct Seg { double x0, y0, angle, len; int depth; std::array<std::int16_t, kMaxPrismDepth> via; };
  std::array<Seg, kMaxBeamSegments> stack;
  int sp = 0, cast = 0;
  Block& l = blocks_[static_cast<std::size_t>(laserSlot)];
  stack[static_cast<std::size_t>(sp++)] = Seg{l.x, l.y, angleDeg, len, 0, {}};
  while (sp > 0) {
    const Seg seg = stack[static_cast<std::size_t>(--sp)];
    const bool first = cast++ == 0;
    const double angle = seg.angle * kDegToRad;
    const double x1 = seg.x0 + dmath::cos(angle) * seg.len, y1 = seg.y0 + dmath::sin(angle) * seg.len;
    double stop = 1.0, t = 0.0;
    int prism = -1;
    std::bitset<kMaxBlocks> seen;  // blockers already dealt with on this beam
    for (;;) {  // the nearest blocker not yet seen
      int best = -1; double bestT = 2.0;
      for (int i = 0; i < orderCount_; ++i) {
        const int s = order_[i];
        const Block& v = blocks_[s];
        if ((v.kind() != BlockKind::Void && v.kind() != BlockKind::Gate) || seen[static_cast<std::size_t>(s)]) continue;
        if (segmentPolygonFirstHit(seg.x0, seg.y0, x1, y1, v.info().outline, v.info().outlineCount, v.x, v.y, t) && t < bestT) { best = s; bestT = t; }
      }
      if (best < 0) break;
      seen.set(static_cast<std::size_t>(best));
      Block& g = blocks_[static_cast<std::size_t>(best)];
      if (g.kind() == BlockKind::Void) { stop = bestT; break; }
      if (g.type == BlockType::PowerPrism) {
        bool been = seg.depth >= kMaxPrismDepth;
        for (int d = 0; d < seg.depth && !been; ++d) been = seg.via[static_cast<std::size_t>(d)] == best;
        if (been) continue;  // straight through
        stop = bestT; prism = best;
        break;
      }
      // Counter / Chance: decided when the beam arrives, kept while it stays (and shared by this laser's beams).
      bool isOpen;
      if (gates[static_cast<std::size_t>(best)]) isOpen = open[static_cast<std::size_t>(best)];
      else if (l.gateHits[static_cast<std::size_t>(best)]) isOpen = l.gateOpen[static_cast<std::size_t>(best)];
      else { isOpen = gateDecide(g); log(isOpen ? Event::Type::Pass : Event::Type::Block, g.id, l.id); }
      gates.set(static_cast<std::size_t>(best));
      open.set(static_cast<std::size_t>(best), isOpen);
      if (!isOpen) { stop = bestT; break; }
    }
    if (first) firstStop = stop;
    const double ex = seg.x0 + (x1 - seg.x0) * stop, ey = seg.y0 + (y1 - seg.y0) * stop;
    for (int i = 0; i < orderCount_; ++i) {
      const int s = order_[i];
      if (s == laserSlot) continue;
      const Block& b = blocks_[s];
      if (!isSourceSide(b.kind()) && b.kind() != BlockKind::Logic && !gapsOnHit(b)) continue;
      if (segmentPolygonFirstHit(seg.x0, seg.y0, ex, ey, b.info().outline, b.info().outlineCount, b.x, b.y, t)) hits.set(static_cast<std::size_t>(s));
    }
    if (beamCount_ < kMaxBeams) beams_[static_cast<std::size_t>(beamCount_++)] = Beam{l.id, seg.x0, seg.y0, ex, ey};
    if (prism < 0) continue;
    const Block& p = blocks_[static_cast<std::size_t>(prism)];
    const int streams = std::clamp(static_cast<int>(std::lround(p.params[P::PowerPrism::streams])), 1, 4);
    const double spread = std::clamp(p.params[P::PowerPrism::spread], 0.0, 360.0), left = seg.len * (1.0 - stop);
    for (int k = streams - 1; k >= 0 && sp < kMaxBeamSegments && cast + sp < kMaxBeamSegments; --k) {  // pushed last-first: cast in order
      Seg child{p.x, p.y, p.params[P::PowerPrism::angle] + (streams > 1 ? spread * (static_cast<double>(k) / (streams - 1) - 0.5) : 0.0), left, seg.depth + 1, seg.via};
      child.via[static_cast<std::size_t>(seg.depth)] = static_cast<std::int16_t>(prism);
      stack[static_cast<std::size_t>(sp++)] = child;
    }
  }
}

/// A synced emitter's slot on the beat grid at `beat`: it emits when this changes (CHG-0004 3.5).
std::int64_t Engine::beatSlotAt(const Block& e, double beat) noexcept {
  const double div = std::max(1.0 / 64.0, e.params[P::PowerEmitter::division]);
  // Offset (CHG-0014): the whole grid is late by a fraction of a division. 0 leaves the beat untouched (v1 timing).
  if (const double offset = std::clamp(e.params[P::PowerEmitter::offset], 0.0, 1.0); offset > 0.0) beat -= offset * div;
  auto slot = static_cast<std::int64_t>(std::floor(beat / div + 1e-9));
  // Swing (owner): the second of each pair of slots fires late, by up to a third of a division (triplet shuffle).
  if (const double swing = std::clamp(e.params[P::PowerEmitter::swing], 0.0, 1.0); swing > 0.0) {
    const auto pair = static_cast<std::int64_t>(std::floor(beat / (2.0 * div) + 1e-9));
    const double within = beat - static_cast<double>(pair) * 2.0 * div;
    slot = pair * 2 + (within + 1e-9 >= div * (1.0 + swing / 3.0) ? 1 : 0);
  }
  return slot;
}

/// The DAW's transport started at `beat` (owner review 2): nothing from before carries over, so every take from the
/// same position plays the same. Particles in flight and pulses end; emitters start their timing again (synced ones
/// fire on the next grid slot, or at once when `beat` is on one; free ones as when just added). Synced lasers need
/// nothing: their angle follows the beat.
void Engine::resyncToTransport(double beat) noexcept {
  particleCount_ = 0;
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    b.pulsePower = 0;
    b.gateStep = 0;
    if (b.type != BlockType::PowerEmitter) continue;
    b.beatSlot = beatSlotAt(b, beat - 1e-6);  // just before: a start on a grid slot fires at once
    b.emitCounter = 0;  // as when added (v1 ParticleEmitter.Init)
  }
  updateGates();
}

void Engine::runTick() noexcept {
  // 0. musical time (SIMULATION-0003): beat_ is the position at this tick; the next tick is 1/kTickRate s later.
  struct Advance { double& beat; double bpm; ~Advance() { beat += bpm / 60.0 / kTickRate; } } advance{beat_, tempo_};
  // 0a. LFOs move their targets (CHG-0018), before anything reads them this tick
  runModulators();
  // 0b. keys held on an Emitter/Laser whose keyboard moved away power it no more
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if (b.keyPower == 0) continue;
    bool kept = false;
    const auto row = graph_.row(order_[k]);
    for (int j = 0; j < orderCount_ && !kept; ++j) kept = row[order_[j]] && blocks_[order_[j]].kind() == BlockKind::Controller;
    if (!kept) { b.keyCount = 0; b.keyPower = 0; }
  }
  // 1. expire pulses that end at this tick
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    int n = 0;
    for (int i = 0; i < b.pulsePower; ++i) if (b.pulseEndTick[i] != tick_) b.pulseEndTick[n++] = b.pulseEndTick[i];
    b.pulsePower = n;
  }
  // 2. emitters (v1 ParticleEmitter.Update, frame counts scaled to ticks)
  for (int k = 0; k < orderCount_; ++k) {
    Block& e = blocks_[order_[k]];
    if (e.type != BlockType::PowerEmitter) continue;
    const bool running = worldPower_ && (e.params[P::PowerEmitter::selfPoweredMode] != 0.0 || e.power() > 0);
    const bool synced = e.params[P::PowerEmitter::sync] != 0.0;
    // Keys pressed since the last tick (CHG-0009): each fires once at its own angle, now, and the repeat starts over.
    if (e.keyPressCount > 0) {
      if (worldPower_) for (int i = 0; i < e.keyPressCount; ++i) emit(e, keyAngle(e.keyPresses[static_cast<std::size_t>(i)]));
      e.keyPressCount = 0;
      if (worldPower_) {
        e.emitCounter = 0;
        if (synced) e.beatSlot = beatSlotAt(e, beat_);
        continue;
      }
    }
    // Repeats: held keys on a polyphonic keyboard repeat together, one particle each; otherwise the Angle (which the
    // newest held key sets).
    auto fire = [this](Block& b) {
      if (b.keyPoly && b.keyCount > 0) for (int i = 0; i < b.keyCount; ++i) emit(b, keyAngle(b.keysHeld[static_cast<std::size_t>(i)]));
      else emit(b);
    };
    if (synced) {
      // Synced (CHG-0004 3.5): emit when the beat crosses the next multiple of `division` (song grid in the plugin).
      const auto slot = beatSlotAt(e, beat_);
      // Starting (or re-synced, or turned on) mid-slot: v1 fires at once when powered, as the unsynced counter does.
      if (running && slot != e.beatSlot) fire(e);
      e.beatSlot = slot;
      if (!running) e.beatSlot = std::numeric_limits<std::int64_t>::min();
      continue;
    }
    const int rateTicks = std::max(1, static_cast<int>(std::lround(e.params[P::PowerEmitter::rate]))) * kTicksPerV1Frame;
    // Unpowered, the counter is primed so it fires at once when powered; Offset (CHG-0014) makes it wait that fraction
    // of the interval first.
    if (!running) { e.emitCounter = rateTicks - static_cast<int>(std::lround(std::clamp(e.params[P::PowerEmitter::offset], 0.0, 1.0) * rateTicks)); continue; }
    if (++e.emitCounter >= rateTicks) { fire(e); e.emitCounter = 0; }
  }
  // 2a. Prisms turn (CHG-0015): Rotate as the Laser's, whenever the world is on (a Prism needs no power).
  if (worldPower_) for (int k = 0; k < orderCount_; ++k) {
    Block& pr = blocks_[order_[k]];
    if (pr.type != BlockType::PowerPrism || std::lround(pr.params[P::PowerPrism::rotate]) == 0) continue;
    double a = pr.params[P::PowerPrism::angle] + pr.params[P::PowerPrism::rotate] / 100.0 / kTicksPerV1Frame;
    if (a > 90.0) a -= 360.0;
    if (a < -270.0) a += 360.0;
    pr.params[P::PowerPrism::angle] = a;
  }
  // 2a'. Sound Lasers (CHG-0016, R7b): on while the level heard is past the threshold (or under it, inverted), and for
  // at least `hold` after.
  for (int k = 0; k < orderCount_; ++k) {
    Block& l = blocks_[order_[k]];
    if (l.type != BlockType::PowerSoundLaser) continue;
    const double db = l.listenEnv > 1e-6 ? 20.0 * dmath::log10(l.listenEnv) : -120.0;
    const bool above = db > l.params[P::PowerSoundLaser::threshold];
    const bool want = l.poolIndex >= 0 && (l.params[P::PowerSoundLaser::invert] != 0.0 ? !above : above);
    if (want) l.holdUntil = tick_ + static_cast<std::uint32_t>(std::lround(std::clamp(l.params[P::PowerSoundLaser::hold], 0.0, 10.0) * kTickRate));
    l.listenOn = want || tick_ < l.holdUntil;
    l.mon[0] = static_cast<float>(db); l.mon[1] = l.listenOn ? 1.0f : 0.0f;
  }
  // 2b. lasers (v1 LaserBeams.UpdateCollisions)
  runLasers();
  // 3. particles: age, collide at current position (topmost block first), then move (v1 ParticleLayer order)
  // R5b (owner, 2026-11-11; SIMULATION-0004): another emitter catches a particle and fires one at once. Those fire
  // after this pass (in hit order), so a new particle starts moving next tick, as an emitter's own do.
  int kept = 0, caughtCount = 0;
  std::array<int, kMaxParticles> caught;  // block slots, filled before read
  struct SplitHit { int slot; double speed; int life; };
  std::array<SplitHit, 256> splits;  // Prisms entered this tick, filled before read
  int splitCount = 0;
  for (int i = 0; i < particleCount_; ++i) {
    Particle p = particles_[i];
    if (--p.life < 1) { continue; }
    bool consumed = false;
    for (int k = orderCount_ - 1; k >= 0 && !consumed; --k) {
      Block& b = blocks_[order_[k]];
      if (b.type == BlockType::PowerEmitter) {
        // Only a particle that came in from outside: not its own emitter's, nor one born inside overlapping emitters
        // (which would pass it back and forth every tick).
        if (p.fresh) continue;
        const auto& inf = b.info();
        if (!pointInPolygon(p.x, p.y, inf.outline, inf.outlineCount, b.x, b.y)) continue;
        if (pointInPolygon(p.x - p.vx, p.y - p.vy, inf.outline, inf.outlineCount, b.x, b.y)) continue;
        consumed = true;
        log(Event::Type::Hit, b.id);
        caught[static_cast<std::size_t>(caughtCount++)] = order_[k];
        continue;
      }
      const BlockKind kind = b.kind();
      if (kind == BlockKind::Gate) {
        // R5c/R5d (CHG-0015): a gate acts on a particle as it enters (as an emitter catches one, R5b). A Counter or
        // Chance lets it carry on or absorbs it; a Prism turns it into its streams, sent off after this pass.
        if (p.fresh) continue;
        const auto& inf = b.info();
        if (!pointInPolygon(p.x, p.y, inf.outline, inf.outlineCount, b.x, b.y)) continue;
        if (pointInPolygon(p.x - p.vx, p.y - p.vy, inf.outline, inf.outlineCount, b.x, b.y)) continue;
        if (b.type == BlockType::PowerPrism) {
          consumed = true;
          log(Event::Type::Split, b.id);
          if (splitCount < static_cast<int>(splits.size())) splits[static_cast<std::size_t>(splitCount++)] = {order_[k], std::sqrt(p.vx * p.vx + p.vy * p.vy), p.life};
        } else if (gateDecide(b)) {
          log(Event::Type::Pass, b.id);
          break;  // through: nothing under the gate sees it this tick
        } else { consumed = true; log(Event::Type::Block, b.id); }
        continue;
      }
      const bool absorbs = kind == BlockKind::Void;
      const bool gaps = gapsOnHit(b);
      const bool reacts = isSourceSide(kind) || kind == BlockKind::Logic || gaps;
      if (!absorbs && !reacts) continue;
      const auto& inf = b.info();
      if (!pointInPolygon(p.x, p.y, inf.outline, inf.outlineCount, b.x, b.y)) continue;
      consumed = true;
      if (absorbs) log(Event::Type::Absorb, b.id);
      else if (gaps) { log(Event::Type::Hit, b.id); powerGap(b); }
      else { log(Event::Type::Hit, b.id); particleHit(b); }
    }
    if (consumed) continue;
    p.x += p.vx; p.y += p.vy; p.fresh = false;
    particles_[kept++] = p;
  }
  particleCount_ = kept;
  for (int i = 0; i < caughtCount; ++i) emit(blocks_[caught[static_cast<std::size_t>(i)]]);
  // R5d: each Prism entered sends out its streams from its centre, at the particle's speed and with the life it had
  // left (so loops between Prisms die out, SIMULATION-0006). When the pool is full the rest are dropped.
  for (int i = 0; i < splitCount; ++i) {
    const SplitHit& h = splits[static_cast<std::size_t>(i)];
    const Block& pr = blocks_[static_cast<std::size_t>(h.slot)];
    const int streams = std::clamp(static_cast<int>(std::lround(pr.params[P::PowerPrism::streams])), 1, 4);
    const double spread = std::clamp(pr.params[P::PowerPrism::spread], 0.0, 360.0);
    for (int k = 0; k < streams && particleCount_ < kMaxParticles; ++k) {
      const double a = (pr.params[P::PowerPrism::angle] + (streams > 1 ? spread * (static_cast<double>(k) / (streams - 1) - 0.5) : 0.0)) * kDegToRad;
      Particle& np = particles_[particleCount_++];
      np.x = pr.x; np.y = pr.y;
      np.vx = dmath::cos(a) * h.speed; np.vy = dmath::sin(a) * h.speed;
      np.life = h.life; np.size = 2.0f + rng_.nextFloat(); np.fresh = true;
    }
  }
  // 3b. Powers whose gap is over give power again (owner, 2026-11-14)
  {
    bool ended = false;
    for (int k = 0; k < orderCount_; ++k) { Block& b = blocks_[order_[k]]; if (b.gapUntil != 0 && tick_ >= b.gapUntil) { b.gapUntil = 0; ended = true; } }
    if (ended) recomputeStaticPower();
  }
  // 4. gates follow power
  updateGates();
  // 5. Arpeggiators step (CHG-0017)
  stepArps();
}

/// Power (Power, Toggle, pulses, lasers, a press) holds the source's mono voice at the default note, as v1's
/// AddPower → NoteOn("power"); losing it releases that voice unless a controller took it over.
void Engine::updateGates() noexcept {
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if (b.kind() != BlockKind::AudioSource) continue;
    const bool want = b.sourcePower() > 0;
    if (b.restrike) { b.restrike = false; if (want && b.powerOn) { restrike(order_[k]); continue; } }
    if (want == b.powerOn) continue;
    b.powerOn = want;
    if (b.type == BlockType::SourceStage) {  // CHG-0021: power is the inner world's power switch
      log(want ? Event::Type::GateOn : Event::Type::GateOff, b.id);
      if (Engine* inner = b.poolIndex >= 0 ? stages_[static_cast<std::size_t>(b.poolIndex)] : nullptr) inner->applyNow(Command::worldPower(want, -1, keepsParticles(b)));
      continue;
    }
    if (b.arranged) { arrange(order_[k], want); continue; }  // CHG-0017: power plays the notes the source is given
    // v1 rule (Source/ConnectionManager): a Power-held source always plays the default envelope (Power triggers
    // before the chain's Envelope block applies its settings); particle, pulse, laser, press and key triggers use it.
    if (want) voiceOn(order_[k], 0, -1, false, 0.0, b.staticPower == 0);
    else voiceOff(order_[k], 0, -1);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// audio
// ---------------------------------------------------------------------------------------------------------------

/// Is chain `a` of `A` identical (same members, same order) to the chain `B` holds for the same first member?
static bool sameChain(const Chains& A, int a, const Chains& B) noexcept {
  const auto ra = A.chains[static_cast<std::size_t>(a)];
  if (ra.count == 0) return false;
  const int b = B.chainOf[A.members[ra.start]];
  if (b < 0) return false;
  const auto rb = B.chains[static_cast<std::size_t>(b)];
  if (ra.count != rb.count) return false;
  for (int m = 0; m < ra.count; ++m) if (A.members[ra.start + m] != B.members[rb.start + m]) return false;
  return true;
}

/// Switch audio to the current chains and fade in every chain that did not exist identically before.
void Engine::switchRouting() noexcept {
  prevChains_ = audioChains_;
  audioChains_ = chains_;
  fadingChains_.reset();
  for (int c = 0; c < audioChains_.chainCount; ++c) if (!sameChain(audioChains_, c, prevChains_)) fadingChains_.set(static_cast<std::size_t>(c));
  fadePos_ = 0;
  fade_ = fadingChains_.any() ? Fade::In : Fade::Idle;
}

/// A topology change reached the audio side (SPEC-CONNECTIONS-PROXIMITY R5): chains that changed fade out on the
/// old routing (5 ms), the routing switches, and the new chains fade in (5 ms). Unchanged chains are never touched.
void Engine::beginRoutingFade() noexcept {
  routingDirty_ = false;
  if (fade_ == Fade::Out) return;  // already fading out: the switch will take the latest chains_
  std::bitset<kMaxBlocks> changed;
  for (int c = 0; c < audioChains_.chainCount; ++c) if (!sameChain(audioChains_, c, chains_)) changed.set(static_cast<std::size_t>(c));
  if (changed.none()) { switchRouting(); return; }  // only additions: nothing to fade out
  fadePos_ = fade_ == Fade::In ? fadeLen_ - fadePos_ : 0;  // reverse an in-progress fade-in without a jump
  fadingChains_ = changed;
  fade_ = Fade::Out;
}

/// Audio In (and the plugins' Microphone, labelled Audio Input): always on, the host input in stereo at unity × gain.
/// Its chain skips the master stage (see renderChain/render), so alone it is a true bypass (owner review 2).
void Engine::addHostInput(const Block& b, int n) noexcept {
  static_assert(P::SourceAudioIn::gain == P::SourceMicrophone::gain);
  if (!chainDirect_) { chainDirect_ = true; std::fill_n(hostL_.begin(), n, 0.0f); std::fill_n(hostR_.begin(), n, 0.0f); }
  if (!inLeft_ && !inRight_) return;
  const float g = static_cast<float>(b.params[P::SourceAudioIn::gain]);
  for (int i = 0; i < n; ++i) {
    const float l = inLeft_ ? inLeft_[inOffset_ + i] : 0.0f, r = inRight_ ? inRight_[inOffset_ + i] : l;
    hostL_[i] += l * g;
    hostR_[i] += r * g;
  }
}

void Engine::renderChain(int c, int n) noexcept {
  const auto r = audioChains_.chains[static_cast<std::size_t>(c)];
  std::fill_n(chainL_.begin(), n, 0.0f);
  chainDirect_ = false; chainStage_ = false;
  // Pre-effects (v1 LFObase): Vibrato/Scuzz LFOs drive every source's oscillator detune in this chain, summed.
  bool detuned = false;
  for (int m = 0; m < r.count; ++m) {
    Block& b = blocks_[audioChains_.members[r.start + m]];
    if (!b.alive || (b.type != BlockType::FxVibrato && b.type != BlockType::FxScuzz)) continue;
    if (!detuned) { std::fill_n(detune_.begin(), n, 0.0); detuned = true; }
    for (int i = 0; i < n; ++i) detune_[i] += b.lfo.next(*wavetables_);
  }
  for (int m = 0; m < r.count; ++m) {  // sources sum (mono, through Tone.Mono's −10 dB) into the chain
    Block& b = blocks_[audioChains_.members[r.start + m]];
    if (!b.alive) continue;
    switch (b.type) {
      case BlockType::SourceAudioIn: addHostInput(b, n); break;
      case BlockType::SourceMicrophone: {  // always on: mic input summed to mono at v1's source level × gain
        if (hostInput_) { addHostInput(b, n); break; }
        if (!inLeft_ && !inRight_) break;
        const double g = kSourceGain * b.params[P::SourceMicrophone::gain];
        for (int i = 0; i < n; ++i) {
          const double l = inLeft_ ? inLeft_[inOffset_ + i] : 0.0, rr = inRight_ ? inRight_[inOffset_ + i] : l;
          chainL_[i] += static_cast<float>((l + rr) * 0.5 * g);
        }
        break;
      }
      case BlockType::SourceTone:
        for (int v = 0; v < kVoices; ++v) {
          Voice& vo = b.voices[static_cast<std::size_t>(v)];
          // Voice 0 free-runs like v1's always-started oscillators (phase never depends on segmentation); the extra
          // poly voices only advance while sounding.
          for (int i = 0; i < n; ++i) {
            if (vo.glideLeft > 0) { vo.pitch = --vo.glideLeft ? vo.pitch + vo.glideStep : vo.glideTo; applyPitch(b, vo); }
            if (!vo.env.active()) {
              if (vo.glideLeft > 0) continue;
              if (v == 0) vo.osc.skip(n - i);
              break;
            }
            double x = detuned ? vo.osc.next(detune_[i]) : vo.osc.next();
            if (vo.lpA < 1.0) x = vo.lpY += vo.lpA * (x - vo.lpY);  // MPE slide → brightness
            chainL_[i] += static_cast<float>(x * vo.env.next() * kSourceGain * glideGain(vo));
          }
        }
        break;
      case BlockType::SourceSample: case BlockType::SourceRecorder: case BlockType::SourceSampleGen: {
        // Tone.Simpler: plays from startPosition to endPosition; with loop, wraps loopEnd → loopStart once reached.
        // Reverse reads the region mirrored (v1 plays a reversed copy of the buffer). Linear interpolation, (L+R)/2.
        const auto& pp = b.params;
        const double len = b.sampleFrames, sr0 = b.sampleRate;
        const double end = std::clamp(pp[P::SourceSample::endPosition] > 0 ? pp[P::SourceSample::endPosition] * sr0 : len, 1.0, std::max(1.0, len));
        double ls = std::clamp(pp[P::SourceSample::loopStart] * sr0, 0.0, end - 1), le = std::clamp(pp[P::SourceSample::loopEnd] * sr0, 0.0, len);
        if (le <= ls) le = end;
        const bool loop = pp[P::SourceSample::loop] != 0.0, rev = pp[P::SourceSample::reverse] != 0.0;
        // v1 Recorder sets Simpler volume to its `volume` param (Tone dB, default +20); Sample/SampleGen never apply it.
        const double gain = kSourceGain * (b.type == BlockType::SourceRecorder ? dsp::toneDbToGain(pp[P::SourceRecorder::volume]) : 1.0);
        for (auto& vo : b.voices) {
          if (!vo.samplePlaying || !b.sampleL) { for (int i = 0; i < n; ++i) if (vo.env.active()) vo.env.next(); continue; }
          for (int i = 0; i < n; ++i) {
            if (vo.glideLeft > 0) vo.pitch = --vo.glideLeft ? vo.pitch + vo.glideStep : vo.glideTo;
            if (!vo.samplePlaying) break;
            double pos = vo.playhead;
            if (rev) pos = len - 1.0 - pos;
            const auto k = static_cast<std::uint32_t>(std::clamp(pos, 0.0, len - 1.0));
            const double f = std::clamp(pos, 0.0, len - 1.0) - k;
            const std::uint32_t k1 = std::min<std::uint32_t>(k + 1, b.sampleFrames - 1);
            const double sl = b.sampleL[k] + f * (b.sampleL[k1] - b.sampleL[k]), sr2 = b.sampleR[k] + f * (b.sampleR[k1] - b.sampleR[k]);
            const double e = vo.env.active() ? vo.env.next() : 0.0;
            chainL_[i] += static_cast<float>(0.5 * (sl + sr2) * e * gain * glideGain(vo));
            vo.playhead += vo.pitch;
            if (loop && vo.playhead >= le) vo.playhead = ls + std::fmod(vo.playhead - ls, std::max(1.0, le - ls));
            else if (!loop && vo.playhead >= end) vo.samplePlaying = false;
          }
        }
        break;
      }
      case BlockType::SourceGranular: renderGranular(b, n); break;
      case BlockType::SourceStage:  // its inner world's mix, in stereo, at the block's level
        if (b.poolIndex >= 0 && stages_[static_cast<std::size_t>(b.poolIndex)]) {
          if (!chainStage_) { chainStage_ = true; std::fill_n(stageL_.begin(), n, 0.0f); std::fill_n(stageR_.begin(), n, 0.0f); }
          const float* buf = stageBuf_.data() + static_cast<std::ptrdiff_t>(b.poolIndex) * 2 * kMaxSegment;
          const auto g = static_cast<float>(std::clamp(b.params[P::SourceStage::gain], 0.0, 4.0));
          for (int i = 0; i < n; ++i) { stageL_[i] += buf[i] * g; stageR_[i] += buf[kMaxSegment + i] * g; }
        }
        break;
      case BlockType::SourceNoise:
        for (int v = 0; v < kVoices; ++v) {
          Voice& vo = b.voices[static_cast<std::size_t>(v)];
          for (int i = 0; i < n; ++i) {
            if (v > 0 && !vo.env.active()) break;  // voice 0 free-runs (golden renders); poly voices only while sounding
            const double x = vo.noise.next();
            if (vo.env.active()) chainL_[i] += static_cast<float>(x * vo.env.next() * kSourceGain * glideGain(vo));
          }
        }
        break;
      default: break;
    }
  }
  std::copy_n(chainL_.begin(), n, chainR_.begin());
  if (chainStage_) for (int i = 0; i < n; ++i) { chainL_[i] += stageL_[i]; chainR_[i] += stageR_[i]; }
  if (chainDirect_) {
    // An Audio In chain skips the master stage, so its other sources take the master volume here, and the host
    // input joins at its own level: effects see the track as it is, and with no effects it is passed through as is.
    const float mg = static_cast<float>(masterGain_);
    for (int i = 0; i < n; ++i) {
      chainL_[i] = chainL_[i] * mg + hostL_[i];
      chainR_[i] = chainR_[i] * mg + hostR_[i];
    }
  }
  // Post-effects in series, chain (DFS) order. Effects always run, even on silence: their state (filter memory,
  // reverb/delay tails, LFO phase) must evolve identically however the timeline is segmented.
  for (int m = 0; m < r.count; ++m) {
    Block& b = blocks_[audioChains_.members[r.start + m]];
    if (!b.alive) continue;
    float* L = chainL_.data(); float* R = chainR_.data();
    switch (b.type) {
      case BlockType::FxFilter:
        b.filter.process(L, R, n);
        if (b.filterLevel != 1.0f) for (int i = 0; i < n; ++i) { L[i] *= b.filterLevel; R[i] *= b.filterLevel; }
        break;
      case BlockType::FxEq: b.eq.process(L, R, n); break;
      case BlockType::FxVolume: b.volume.process(L, R, n); break;
      case BlockType::FxDistortion: b.distortion.process(L, R, n); break;
      case BlockType::FxBitCrusher: b.crusher.process(L, R, n); break;
      case BlockType::FxPhaser: b.phaser.process(L, R, n, *wavetables_); break;
      case BlockType::FxChorus: b.chorus.process(L, R, n, *wavetables_); break;
      case BlockType::FxReverb: b.reverb.process(L, R, n); break;
      case BlockType::FxStereoDelay: b.pingpong.process(L, R, n); break;
      case BlockType::FxAutoWah: b.autowah.process(L, R, n); break;
      case BlockType::FxChomp: b.chomp.process(L, R, n); break;
      case BlockType::FxChopper: b.chopper.process(L, R, n, *wavetables_); break;
      case BlockType::FxPitchShifter: b.pitchshift.process(L, R, n, *wavetables_); break;
      case BlockType::FxCompressor:
        if (b.poolIndex >= 0) {  // CHG-0014: Chromium's DynamicsCompressor (as the master bus), then the Makeup gain
          auto& comp = compressors_[static_cast<std::size_t>(b.poolIndex)];
          const auto makeup = static_cast<float>(dmath::exp10(std::clamp(b.params[P::FxCompressor::makeup], -24.0, 24.0) / 20.0));
          float peak = 0.0f;
          for (int i = 0; i < n; ++i) {
            peak = std::max(peak, std::max(std::abs(L[i]), std::abs(R[i])));
            comp.process(L[i], R[i]);
            L[i] *= makeup; R[i] *= makeup;
          }
          // The panel's meter: the input's peak in dB, falling 20 dB/s between peaks, and the gain reduction now.
          const float db = peak > 1e-5f ? static_cast<float>(20.0 * dmath::log10(peak)) : -100.0f;
          b.mon[0] = std::max(db, b.mon[0] - 20.0f * static_cast<float>(n) / static_cast<float>(sampleRate_));
          b.mon[1] = static_cast<float>(comp.reductionDb());
        }
        break;
      case BlockType::FxConvolver:
        if (b.poolIndex >= 0) {
          dsp::EqualPower mix; mix.set(b.params[P::FxConvolver::mix]);
          const auto& k = b.userImpulse ? userImpulses_[static_cast<std::size_t>(b.poolIndex)] : *defaultImpulse_;
          convolvers_[static_cast<std::size_t>(b.poolIndex)].process(k, L, R, n, mix.dry, mix.wet);
        }
        break;
      default: break;
    }
  }
}

void Engine::render(float* left, float* right, int n) noexcept {
  std::fill_n(mixL_.begin(), n, 0.0f);
  std::fill_n(mixR_.begin(), n, 0.0f);
  bool anyDirect = false;
  // Inner worlds (CHG-0021) render the same samples, whether or not their block is in a chain yet: their clocks
  // never drift from this one.
  if (!child_) for (int i = 0; i < kMaxStages; ++i) if (Engine* inner = stages_[static_cast<std::size_t>(i)]) {
    float* buf = stageBuf_.data() + static_cast<std::ptrdiff_t>(i) * 2 * kMaxSegment;
    // The host input (the Microphone, Audio In) reaches blocks inside a Stage too.
    inner->process(inLeft_ ? inLeft_ + inOffset_ : nullptr, inRight_ ? inRight_ + inOffset_ : nullptr, buf, buf + kMaxSegment, static_cast<std::uint32_t>(n));
    inner->clearEvents();
  }
  // Sound Lasers (CHG-0016): which chains each one hears (those of the sources connected to it).
  std::array<std::bitset<kMaxBlocks>, kMaxListeners> heard;
  bool listening = false;
  for (int i = 0; i < kMaxListeners; ++i) {
    const int s = listenerOwner_[static_cast<std::size_t>(i)];
    if (s < 0) continue;
    listening = true;
    std::fill_n(listenBuf_.begin() + static_cast<std::ptrdiff_t>(i) * kMaxSegment, n, 0.0f);
    const auto& row = graph_.row(s);
    for (int k = 0; k < orderCount_; ++k) {
      const int src = order_[k], c = audioChains_.chainOf[static_cast<std::size_t>(src)];
      if (row[static_cast<std::size_t>(src)] && c >= 0) heard[static_cast<std::size_t>(i)].set(static_cast<std::size_t>(c));
    }
  }
  for (int c = 0; c < audioChains_.chainCount; ++c) {
    renderChain(c, n);
    if (listening) for (int i = 0; i < kMaxListeners; ++i) {  // as it sounds: after the chain's effects, mono
      if (listenerOwner_[static_cast<std::size_t>(i)] < 0 || !heard[static_cast<std::size_t>(i)][static_cast<std::size_t>(c)]) continue;
      float* buf = listenBuf_.data() + static_cast<std::ptrdiff_t>(i) * kMaxSegment;
      for (int k = 0; k < n; ++k) buf[k] += 0.5f * (chainL_[k] + chainR_[k]);
    }
    if (chainDirect_ && !anyDirect) { anyDirect = true; std::fill_n(directL_.begin(), n, 0.0f); std::fill_n(directR_.begin(), n, 0.0f); }
    const bool fading = fade_ != Fade::Idle && fadingChains_[static_cast<std::size_t>(c)];
    for (int i = 0; i < n; ++i) {
      double g = 1.0;
      if (fading) {
        const double t = static_cast<double>(fadePos_ + i) / fadeLen_;
        g = fade_ == Fade::Out ? 1.0 - t : t;
      }
      float* toL = chainDirect_ ? directL_.data() : mixL_.data();
      float* toR = chainDirect_ ? directR_.data() : mixR_.data();
      if (fading) { toL[i] += static_cast<float>(chainL_[i] * g); toR[i] += static_cast<float>(chainR_[i] * g); }
      else { toL[i] += chainL_[i]; toR[i] += chainR_[i]; }
    }
  }
  if (listening) listen(n);
  // Pre-effect LFOs outside any chain keep their phase (Tone LFOs run from block creation).
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if ((b.type == BlockType::FxVibrato || b.type == BlockType::FxScuzz) && audioChains_.chainOf[order_[k]] < 0) b.lfo.skip(n);
  }
  for (int i = 0; i < n; ++i) {
    // v1 order: chains -> master compressor (Chromium DynamicsCompressor) -> master volume.
    float l = mixL_[i], r = mixR_[i];
    if (useCompressor_) compressor_.process(l, r);
    left[i] = static_cast<float>(l * masterGain_);
    right[i] = static_cast<float>(r * masterGain_);
    if (anyDirect) { left[i] += directL_[i]; right[i] += directR_[i]; }
  }
  if (fade_ != Fade::Idle) {
    fadePos_ += n;
    if (fadePos_ >= fadeLen_) {
      if (fade_ == Fade::Out) switchRouting();
      else { fade_ = Fade::Idle; fadePos_ = 0; fadingChains_.reset(); }
    }
  }
}

/// What each Sound Laser heard this segment, through its band filter, into its level: the peak, falling by half every
/// 35 ms or so (a 50 ms time constant). Per sample, so it does not depend on how the timeline is cut into segments.
void Engine::listen(int n) noexcept {
  for (int i = 0; i < kMaxListeners; ++i) {
    const int s = listenerOwner_[static_cast<std::size_t>(i)];
    if (s < 0) continue;
    Block& l = blocks_[static_cast<std::size_t>(s)];
    const float* buf = listenBuf_.data() + static_cast<std::ptrdiff_t>(i) * kMaxSegment;
    const bool filtered = std::lround(l.params[P::PowerSoundLaser::band]) != 0;
    double env = l.listenEnv;
    for (int k = 0; k < n; ++k) {
      float x = buf[k];
      if (filtered) x = l.eq.l[1].process(l.eq.l[0].process(x));
      env = std::max(static_cast<double>(std::abs(x)), env * listenDecay_);
    }
    l.listenEnv = env < 1e-30 ? 0.0 : env;
  }
}

void Engine::process(float* left, float* right, std::uint32_t frames) noexcept { process(nullptr, nullptr, left, right, frames); }

void Engine::process(const float* inLeft, const float* inRight, float* left, float* right, std::uint32_t frames) noexcept {
  inLeft_ = inLeft; inRight_ = inRight;
  std::uint32_t done = 0;
  while (done < frames) {
    const std::int64_t nextTick = tickSample(tick_);
    if (sample_ == nextTick) {
      applyDueCommands();
      runTick();
      ++tick_;
      continue;
    }
    if (routingDirty_) beginRoutingFade();
    std::int64_t limit = kMaxSegment;
    if (fade_ != Fade::Idle) limit = std::min<std::int64_t>(limit, fadeLen_ - fadePos_);  // switch exactly at the fade end
    const auto len = static_cast<int>(std::min<std::int64_t>({static_cast<std::int64_t>(frames - done), nextTick - sample_, limit}));
    inOffset_ = static_cast<int>(done);
    render(left + done, right + done, len);
    done += static_cast<std::uint32_t>(len);
    sample_ += len;
  }
}

}  // namespace blokdust

namespace blokdust {
/// v1 Granular.GrainLoop on 12 Tone.SimplePlayers with AmplitudeEnvelopes, sample-accurate: while the block plays
/// (powered or a note held), a grain starts every grainlength × 3 / density s (v1's setTimeout of
/// round(grainlength × 2 / density × 1500) ms) at region ± spread/2 (uniform, clamped to [0, duration − grainlength]),
/// cycling through `density` players. Each grain plays at the note's playback rate; its envelope rises over 40% of the
/// grain length (v1 _RampLength), holds, and releases over the last 40%. The sum goes through the lead voice's envelope.
/// MPE (PLUGIN-0004): pressure scales the volume; slide places the grains (0 = start … 1 = end of the file).
void Engine::renderGranular(Block& b, int n) noexcept {
  const auto& p = b.params;
  Voice* lead = nullptr;
  for (auto& vo : b.voices) if (vo.env.active() && (!lead || vo.activeAt > lead->activeAt)) lead = &vo;
  for (auto& vo : b.voices) if (&vo != lead && vo.env.active()) for (int i = 0; i < n; ++i) vo.env.next();
  if (!lead) { for (auto& g : b.grains) g.on = false; return; }
  const double gl = std::clamp(p[P::SourceGranular::grainlength], 0.01, 2.0);
  const int density = std::clamp(static_cast<int>(std::lround(p[P::SourceGranular::density])), 1, static_cast<int>(b.grains.size()));
  const double dur = b.sampleFrames > 0 ? b.sampleFrames / b.sampleRate : 0.0;
  const int interval = std::max(1, static_cast<int>(std::lround(std::round(gl * 2.0 / density * 1500.0) / 1000.0 * sampleRate_)));
  const int len = std::max(4, static_cast<int>(std::lround(gl * sampleRate_)));
  const int attack = std::max(1, static_cast<int>(std::lround(gl * 0.4 * sampleRate_)));
  const int releaseAt = static_cast<int>(std::lround(gl * 0.6 * sampleRate_));
  const int release = std::max(1, len - releaseAt);
  for (int i = 0; i < n; ++i) {
    if (lead->active && b.sampleL && dur > gl && --b.grainTimer <= 0) {
      b.grainTimer = interval;
      Block::Grain& g = b.grains[static_cast<std::size_t>(b.grainIndex)];
      b.grainIndex = (b.grainIndex + 1) % density;
      const double centre = lead->slide >= 0.0 ? lead->slide * dur : p[P::SourceGranular::region];
      const double spread = std::max(0.0, p[P::SourceGranular::spread]);
      const double at = std::clamp(centre - spread * 0.5 + b.grainRng.nextFloat() * spread, 0.0, dur - gl);
      // v1 Granular.SetPitch: the next grains take the new note's rate at once (no glide), the sounding ones keep theirs.
      g.on = true; g.pos = at * b.sampleRate; g.rate = lead->glideLeft > 0 ? lead->glideTo : lead->pitch; g.age = 0; g.len = len;
    }
    // A glide set by a keyboard runs on (its voice's pitch arrives) though grains do not glide (owner bug 2026-11-14:
    // without this the pitch never left the first note).
    for (auto& vo : b.voices) if (vo.glideLeft > 0) vo.pitch = --vo.glideLeft ? vo.pitch + vo.glideStep : vo.glideTo;
    double sum = 0.0;
    for (auto& g : b.grains) {
      if (!g.on) continue;
      const double e = g.age < attack ? static_cast<double>(g.age) / attack : g.age < releaseAt ? 1.0 : std::max(0.0, 1.0 - static_cast<double>(g.age - releaseAt) / release);
      const double pos = std::min(g.pos, static_cast<double>(b.sampleFrames) - 1.0);
      const auto k = static_cast<std::uint32_t>(pos);
      const double f = pos - k;
      const std::uint32_t k1 = std::min<std::uint32_t>(k + 1, b.sampleFrames - 1);
      const double sl = b.sampleL[k] + f * (b.sampleL[k1] - b.sampleL[k]), sr = b.sampleR[k] + f * (b.sampleR[k1] - b.sampleR[k]);
      sum += 0.5 * (sl + sr) * e;
      g.pos += g.rate;
      if (++g.age >= g.len || g.pos >= b.sampleFrames - 1) g.on = false;
    }
    const double env = lead->env.next();
    chainL_[i] += static_cast<float>(sum * env * kSourceGain * glideGain(*lead));
  }
}
int Engine::monitors(Monitor* out, int max) const noexcept {
  int n = 0;
  for (int k = 0; k < orderCount_ && n < max; ++k) {
    const Block& b = blocks_[order_[k]];
    if (b.type == BlockType::FxCompressor) out[n++] = {b.id, {b.mon[0], b.mon[1], b.mon[2], b.mon[3]}};
    else if (b.type == BlockType::FxLfo) out[n++] = {b.id, {b.mon[0], b.mon[1], b.mon[2], 0.0f}};
    else if (b.type == BlockType::PowerSoundLaser) out[n++] = {b.id, {b.mon[0], b.mon[1], 0.0f, 0.0f}};
    else if (b.type == BlockType::PowerCounter) out[n++] = {b.id, {static_cast<float>(b.gateStep), b.gatePassed ? 1.0f : 0.0f, 0.0f, 0.0f}};
    else if (b.type == BlockType::PowerPrism) out[n++] = {b.id, {static_cast<float>(b.params[P::PowerPrism::angle]), 0.0f, 0.0f, 0.0f}};
  }
  return n;
}
int Engine::playheads(Playhead* out, int max) const noexcept {
  int n = 0;
  for (int k = 0; k < orderCount_ && n < max; ++k) {
    const Block& b = blocks_[order_[k]];
    if (!b.sampleL || b.sampleFrames == 0 || b.sampleRate <= 0.0) continue;
    if (isSampler(b.type)) {
      for (const auto& vo : b.voices)
        if (vo.samplePlaying && vo.env.active() && n < max) out[n++] = {b.id, static_cast<float>(vo.playhead / b.sampleRate)};
    } else if (b.type == BlockType::SourceGranular) {
      for (const auto& g : b.grains)
        if (g.on && n < max) out[n++] = {b.id, static_cast<float>(g.pos / b.sampleRate)};
    }
  }
  return n;
}
}  // namespace blokdust
