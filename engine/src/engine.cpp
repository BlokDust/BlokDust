// The engine (ARCHITECTURE-0002): construction, Stage worlds, samples, DSP pools and lookups. The
// rest of Engine is split by job: engine_commands.cpp, engine_notes.cpp, engine_arrange.cpp,
// engine_voices.cpp, engine_hits.cpp, engine_tick.cpp, engine_render.cpp, engine_granular.cpp.
#include "engine_internal.hpp"

namespace blokdust {

// Sample, Recorder and SampleGen are all v1 SamplerBase (Tone.Simpler): same params in the same
// order.
static_assert(int{P::SourceRecorder::playbackRate} == int{P::SourceSample::playbackRate} &&
                  int{P::SourceRecorder::loopEnd} == int{P::SourceSample::loopEnd} &&
                  int{P::SourceRecorder::volume} == int{P::SourceSample::volume} &&
                  int{P::SourceSampleGen::loopEnd} == int{P::SourceSample::loopEnd} &&
                  int{P::SourceSampleGen::reverse} == int{P::SourceSample::reverse},
              "sampler params must line up");

Engine::Engine(const EngineConfig& cfg)
    : sampleRate_(cfg.sampleRate),
      rng_(cfg.seed),
      tables_(cfg.parent ? cfg.parent->tables_
                         : std::make_shared<const dsp::TableBank>(cfg.sampleRate)),
      wavetables_(cfg.parent ? cfg.parent->wavetables_
                             : std::make_shared<const dsp::WavetableBank>(cfg.sampleRate)),
      child_(cfg.child),
      useCompressor_(cfg.masterCompressor && !cfg.child),
      hostInput_(cfg.hostInput) {
  compressor_.configure(cfg.sampleRate);
  seed_ = cfg.seed;
  if (cfg.child)
    masterGain_ = 1.0;  // its mix is a source in the outer patch, which has the master stage
  gainGlide_ = 1.0 - dmath::exp(-1.0 / (0.005 * cfg.sampleRate));
  fadeLen_ = std::max(
      1, cfg.sampleRate / 200);  // 5 ms out + 5 ms in (SPEC-CONNECTIONS-PROXIMITY R5: ≤ 10 ms)
  const auto pow2 = [](double n) {
    std::uint32_t s = 2;
    while (s < n)
      s <<= 1;
    return s;
  };
  const double sr = cfg.sampleRate;
  const int div = cfg.child ? 4 : 1;  // an inner world has a quarter of each pool
  reverbPool_.init(8, pow2(0.0367 * sr + 4),
                   kMaxReverbs / div);  // Freeverb combs (longest 1617/44100 s)
  delayPool_.init(3, pow2(kMaxDelaySeconds * sr + 4),
                  kMaxDelays / div);  // PingPong: v1 delayTime ≤ 0.5 s; synced ≤ 1 s
  chorusPool_.init(4, pow2(0.0165 * sr + 132),
                   kMaxChoruses / div);  // modulated delays ≤ 16 ms, + 128-frame quanta
  pitchPool_.init(4, pow2(dsp::PitchShiftFx::kWindow * sr + 4),
                  kMaxPitchShifters / div);  // A/B delays per side
  const int maxTaps = static_cast<int>(kMaxImpulseSeconds * sr);
  if (cfg.parent)
    defaultImpulse_ = cfg.parent->defaultImpulse_;
  else {
    auto kernel = std::make_shared<dsp::ConvolutionKernel>();
    kernel->reserve(maxTaps);
    std::vector<float> l(static_cast<std::size_t>(maxTaps)), r(static_cast<std::size_t>(maxTaps));
    dsp::makeDefaultImpulse(l.data(), r.data(), maxTaps, sr);
    kernel->build(l.data(), r.data(), static_cast<std::uint32_t>(maxTaps), sr, sr);
    defaultImpulse_ = kernel;
  }
  const int convolvers = kMaxConvolvers / div;
  convolvers_.resize(static_cast<std::size_t>(convolvers));
  userImpulses_.resize(static_cast<std::size_t>(convolvers));
  for (auto& convolver : convolvers_)
    convolver.reserve(defaultImpulse_->maxTailParts());
  for (auto& k : userImpulses_)
    k.reserve(maxTaps);
  convolverOwner_.assign(static_cast<std::size_t>(convolvers), -1);
  compressors_.resize(static_cast<std::size_t>(kMaxCompressors / div));
  for (auto& c : compressors_)
    c.configure(cfg.sampleRate);
  compressorOwner_.assign(compressors_.size(), -1);
  listenBuf_.assign(static_cast<std::size_t>(kMaxListeners) * kMaxSegment, 0.0f);
  listenerOwner_.fill(-1);
  listenDecay_ = dmath::exp(-1.0 / (0.05 * cfg.sampleRate));
  stageOwner_.fill(-1);
  if (!cfg.child)
    stageBuf_.assign(static_cast<std::size_t>(kMaxStages) * 2 * kMaxSegment, 0.0f);
}

/// R13b: does Stage `b` keep its inner world's particles in flight when it loses power? Not while
/// this world's POWER switch is off: that clears particles everywhere.
bool Engine::keepsParticles(const Block& block) const noexcept BLOKDUST_NONBLOCKING {
  return worldPower_ && block.params[P::SourceStage::keepParticles] != 0.0;
}

/// A Stage block's inner world (CHG-0021). From here its clock is this engine's: the same sample,
/// the same tick grid and beat, so both worlds tick together however the host cuts the timeline.
/// Its world power is the block's power.
bool Engine::attachStage(BlockId id, Engine* inner) noexcept {
  const int slot = slotOf(id);
  if (slot < 0 || child_ || inner == this)
    return false;
  Block& block = blocks_[static_cast<std::size_t>(slot)];
  if (block.type != BlockType::SourceStage || block.poolIndex < 0 || (inner && !inner->child_))
    return false;
  stages_[static_cast<std::size_t>(block.poolIndex)] = inner;
  stageNoteCount_[static_cast<std::size_t>(block.poolIndex)] = 0;
  if (!inner)
    return true;
  inner->hostInput_ = hostInput_;  // the plugins' Microphone is the host input, inside a Stage too
  inner->sample_ = sample_;
  inner->tick_ = tick_;
  inner->tickOrigin_ = tickOrigin_;
  inner->tickBase_ = tickBase_;
  inner->tempo_ = tempo_;
  inner->beat_ = beat_;
  inner->worldPower_ = true;
  inner->apply(Command::worldPower(block.powerOn, -1, keepsParticles(block)));
  return true;
}

Engine* Engine::stage(BlockId id) const noexcept {
  const int slot = slotOf(id);
  if (slot < 0)
    return nullptr;
  const Block& block = blocks_[static_cast<std::size_t>(slot)];
  return block.type == BlockType::SourceStage && block.poolIndex >= 0
             ? stages_[static_cast<std::size_t>(block.poolIndex)]
             : nullptr;
}

bool Engine::attachSample(BlockId id, const SampleBuffer& sb) noexcept {
  const int slot = slotOf(id);
  if (slot < 0)
    return false;
  Block& block = blocks_[static_cast<std::size_t>(slot)];
  if (block.type == BlockType::FxConvolver) {
    if (block.poolIndex < 0)
      return false;
    auto& k = userImpulses_[static_cast<std::size_t>(block.poolIndex)];
    k.build(sb.left, sb.right, sb.left ? sb.frames : 0,
            sb.sampleRate > 0 ? sb.sampleRate : sampleRate_, sampleRate_);
    block.userImpulse = k.valid();
    return true;
  }
  if (!isSampler(block.type) && block.type != BlockType::SourceGranular)
    return false;
  block.sampleL = sb.frames ? sb.left : nullptr;
  block.sampleR = sb.frames ? (sb.right ? sb.right : sb.left) : nullptr;
  block.sampleFrames = sb.left ? sb.frames : 0;
  block.sampleRate = sb.sampleRate > 0 ? sb.sampleRate : sampleRate_;
  for (auto& v : block.voices)
    v.samplePlaying = false;
  for (auto& g : block.grains)
    g.on = false;
  if (block.type == BlockType::SourceGranular) {  // v1 SetupGrains: a new file starts at its middle
                                                  // unless the patch says
    if (block.sampleFrames && block.params[P::SourceGranular::region] <= 0.0)
      block.params[P::SourceGranular::region] = block.sampleFrames / block.sampleRate / 2.0;
    return true;
  }
  if (block.sampleFrames &&
      block.params[P::SourceSample::endPosition] <= 0.0) {  // v1 Sample.SetBuffers defaults
    const double dur = block.sampleFrames / block.sampleRate;
    block.params[P::SourceSample::startPosition] = 0.0;
    block.params[P::SourceSample::endPosition] = dur;
    block.params[P::SourceSample::loopStart] = dur * 0.5;
    block.params[P::SourceSample::loopEnd] = dur;
  }
  configureDsp(block);
  for (auto& v : block.voices)
    if (v.active) {  // v1: retrigger if playing
      v.playhead = block.params[P::SourceSample::startPosition] * block.sampleRate;
      v.samplePlaying = block.sampleFrames > 0;
      v.env.gateOn();
    }
  return true;
}

void Engine::FxPool::init(int linesPer, std::uint32_t size, int count) {
  lines = linesPer;
  lineSize = size;
  capacity = count;
  mem.assign(static_cast<std::size_t>(linesPer) * size * static_cast<std::size_t>(count), 0.0f);
  owner.assign(static_cast<std::size_t>(count), -1);
}

int Engine::FxPool::acquire(int slot) noexcept {
  for (int i = 0; i < capacity; ++i)
    if (owner[static_cast<std::size_t>(i)] < 0) {
      owner[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
      return i;
    }
  return -1;
}

void Engine::acquireDsp(Block& block, int slot) noexcept BLOKDUST_NONBLOCKING {
  FxPool* pool = block.type == BlockType::FxReverb        ? &reverbPool_
                 : block.type == BlockType::FxStereoDelay ? &delayPool_
                 : block.type == BlockType::FxChorus      ? &chorusPool_
                                                          : nullptr;
  if (block.type == BlockType::SourceNoise)  // voice 0 keeps the original seed (golden renders);
                                             // the others derive from it
    for (int v = 0; v < kVoices; ++v)
      block.voices[static_cast<std::size_t>(v)].noise.seed(
          seed_ * 0x9E3779B97F4A7C15ULL + block.id + static_cast<std::uint64_t>(v) * 0x1000193ULL);
  if (block.type == BlockType::FxConvolver) {
    for (int i = 0; i < static_cast<int>(convolverOwner_.size()); ++i)
      if (convolverOwner_[static_cast<std::size_t>(i)] < 0) {
        convolverOwner_[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
        convolvers_[static_cast<std::size_t>(i)].reset();
        block.poolIndex = static_cast<std::int16_t>(i);
        block.userImpulse = false;
        break;
      }
    return;
  }
  if (block.type == BlockType::SourceStage) {  // a place for an inner world (none in a child: depth
                                               // 2, SCOPE-0006)
    if (!child_)
      for (int i = 0; i < kMaxStages; ++i)
        if (stageOwner_[static_cast<std::size_t>(i)] < 0) {
          stageOwner_[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
          stages_[static_cast<std::size_t>(i)] = nullptr;
          stageNoteCount_[static_cast<std::size_t>(i)] = 0;
          block.poolIndex = static_cast<std::int16_t>(i);
          break;
        }
    return;
  }
  if (block.type == BlockType::PowerSoundLaser) {
    for (int i = 0; i < kMaxListeners; ++i)
      if (listenerOwner_[static_cast<std::size_t>(i)] < 0) {
        listenerOwner_[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
        block.poolIndex = static_cast<std::int16_t>(i);
        break;
      }
    return;
  }
  if (block.type == BlockType::FxCompressor) {
    for (int i = 0; i < static_cast<int>(compressorOwner_.size()); ++i)
      if (compressorOwner_[static_cast<std::size_t>(i)] < 0) {
        compressorOwner_[static_cast<std::size_t>(i)] = static_cast<std::int16_t>(slot);
        compressors_[static_cast<std::size_t>(i)].reset();
        block.poolIndex = static_cast<std::int16_t>(i);
        block.mon[0] = -100.0f;
        break;
      }
    return;
  }
  if (block.type == BlockType::FxPitchShifter)
    pool = &pitchPool_;
  if (!pool)
    return;
  block.poolIndex = static_cast<std::int16_t>(pool->acquire(slot));
  if (block.poolIndex < 0)
    return;  // exhausted: the effect passes audio through unchanged
  const int i = block.poolIndex;
  if (block.type == BlockType::FxReverb)
    for (int k = 0; k < 8; ++k)
      block.reverb.comb[static_cast<std::size_t>(k)].attach(pool->line(i, k));
  if (block.type == BlockType::FxStereoDelay) {
    block.pingpong.dl.attach(pool->line(i, 0));
    block.pingpong.dr.attach(pool->line(i, 1));
    block.pingpong.pre.attach(pool->line(i, 2));
  }
  if (block.type == BlockType::FxPitchShifter) {
    block.pitchshift.aL.attach(pool->line(i, 0));
    block.pitchshift.aR.attach(pool->line(i, 1));
    block.pitchshift.bL.attach(pool->line(i, 2));
    block.pitchshift.bR.attach(pool->line(i, 3));
  }
  if (block.type == BlockType::FxChorus) {
    block.chorus.dl.attach(pool->line(i, 0));
    block.chorus.dr.attach(pool->line(i, 1));
    block.chorus.qL.attach(pool->line(i, 2));
    block.chorus.qR.attach(pool->line(i, 3));
  }
}

void Engine::releaseDsp(Block& block) noexcept BLOKDUST_NONBLOCKING {
  if (block.type == BlockType::FxReverb)
    reverbPool_.release(block.poolIndex);
  if (block.type == BlockType::FxStereoDelay)
    delayPool_.release(block.poolIndex);
  if (block.type == BlockType::FxChorus)
    chorusPool_.release(block.poolIndex);
  if (block.type == BlockType::FxPitchShifter)
    pitchPool_.release(block.poolIndex);
  if (block.type == BlockType::FxConvolver && block.poolIndex >= 0)
    convolverOwner_[static_cast<std::size_t>(block.poolIndex)] = -1;
  if (block.type == BlockType::SourceStage && block.poolIndex >= 0) {
    stageOwner_[static_cast<std::size_t>(block.poolIndex)] = -1;
    stages_[static_cast<std::size_t>(block.poolIndex)] = nullptr;
  }
  if (block.type == BlockType::PowerSoundLaser && block.poolIndex >= 0)
    listenerOwner_[static_cast<std::size_t>(block.poolIndex)] = -1;
  if (block.type == BlockType::FxCompressor && block.poolIndex >= 0)
    compressorOwner_[static_cast<std::size_t>(block.poolIndex)] = -1;
  block.poolIndex = -1;
}

bool Engine::mapAutomation(BlockType t, std::uint8_t param, double v, double& out) noexcept {
  const auto& inf = gen::info(t);
  if (param >= inf.paramCount)
    return false;
  const auto& p = inf.params[param];
  if (p.transform == gen::UiTransform::None)
    return false;
  v = std::clamp(v, 0.0, 1.0);
  const double ui = p.uiMin + v * (p.uiMax - p.uiMin);
  switch (p.transform) {
    case gen::UiTransform::Identity:
      out = ui;
      break;
    case gen::UiTransform::SubtractFrom:
      out = p.k - ui;
      break;
    case gen::UiTransform::Minus:
      out = ui - p.k;
      break;
    case gen::UiTransform::Divide:
      out = ui / p.k;
      break;
    case gen::UiTransform::None:
      return false;
  }
  return true;
}

int Engine::slotOf(BlockId id) const noexcept BLOKDUST_NONBLOCKING {
  if (id == kInvalidBlock)
    return -1;
  for (int i = 0; i < orderCount_; ++i)
    if (blocks_[order_[i]].id == id)
      return order_[i];
  return -1;
}

bool Engine::connected(BlockId a, BlockId b) const noexcept BLOKDUST_NONBLOCKING {
  const int sa = slotOf(a), sb = slotOf(b);
  return sa >= 0 && sb >= 0 && graph_.connected(sa, sb);
}

void Engine::log(Event::Type t, BlockId a, BlockId b) noexcept BLOKDUST_NONBLOCKING {
  if (eventCount_ >= kEventLogCapacity) {
    ++droppedEvents_;
    return;
  }
  events_[eventCount_++] = Event{sample_, tick_, t, a, b};
}

}  // namespace blokdust
