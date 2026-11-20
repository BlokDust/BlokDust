// The engine (ARCHITECTURE-0002): construction, Stage worlds, samples, DSP pools and lookups. The rest of Engine is
// split by job: engine_commands.cpp, engine_notes.cpp, engine_arrange.cpp, engine_voices.cpp, engine_hits.cpp,
// engine_tick.cpp, engine_render.cpp, engine_granular.cpp.
#include "engine_internal.hpp"

namespace blokdust {

// Sample, Recorder and SampleGen are all v1 SamplerBase (Tone.Simpler): same params in the same order.
static_assert(P::SourceRecorder::playbackRate == P::SourceSample::playbackRate && P::SourceRecorder::loopEnd == P::SourceSample::loopEnd &&
              P::SourceRecorder::volume == P::SourceSample::volume && P::SourceSampleGen::loopEnd == P::SourceSample::loopEnd &&
              P::SourceSampleGen::reverse == P::SourceSample::reverse, "sampler params must line up");

Engine::Engine(const EngineConfig& cfg)
    : sampleRate_(cfg.sampleRate), rng_(cfg.seed),
      tables_(cfg.parent ? cfg.parent->tables_ : std::make_shared<const dsp::TableBank>(cfg.sampleRate)),
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

}  // namespace blokdust
