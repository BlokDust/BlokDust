// Engine: audio: routing fades, each chain rendered, the mix, listeners, process().
#include "engine_internal.hpp"

namespace blokdust {

// ---------------------------------------------------------------------------------------------------------------
// audio
// ---------------------------------------------------------------------------------------------------------------

/// Is chain `a` of `A` identical (same members, same order) to the chain `B` holds for the same
/// first member?
static bool sameChain(const Chains& A, int a, const Chains& B) noexcept {
  const auto ra = A.chains[static_cast<std::size_t>(a)];
  if (ra.count == 0)
    return false;
  const int b = B.chainOf[A.members[ra.start]];
  if (b < 0)
    return false;
  const auto rb = B.chains[static_cast<std::size_t>(b)];
  if (ra.count != rb.count)
    return false;
  for (int m = 0; m < ra.count; ++m)
    if (A.members[ra.start + m] != B.members[rb.start + m])
      return false;
  return true;
}

/// Switch audio to the current chains and fade in every chain that did not exist identically
/// before.
void Engine::switchRouting() noexcept BLOKDUST_NONBLOCKING {
  prevChains_ = audioChains_;
  audioChains_ = chains_;
  fadingChains_.reset();
  for (int c = 0; c < audioChains_.chainCount; ++c)
    if (!sameChain(audioChains_, c, prevChains_))
      fadingChains_[static_cast<std::size_t>(c)] = true;
  fadePos_ = 0;
  fade_ = fadingChains_.any() ? Fade::In : Fade::Idle;
}

/// A topology change reached the audio side (SPEC-CONNECTIONS-PROXIMITY R5): chains that changed
/// fade out on the old routing (5 ms), the routing switches, and the new chains fade in (5 ms).
/// Unchanged chains are never touched.
void Engine::beginRoutingFade() noexcept BLOKDUST_NONBLOCKING {
  routingDirty_ = false;
  if (fade_ == Fade::Out)
    return;  // already fading out: the switch will take the latest chains_
  std::bitset<kMaxBlocks> changed;
  for (int c = 0; c < audioChains_.chainCount; ++c)
    if (!sameChain(audioChains_, c, chains_))
      changed[static_cast<std::size_t>(c)] = true;
  if (changed.none()) {
    switchRouting();
    return;
  }  // only additions: nothing to fade out
  fadePos_ =
      fade_ == Fade::In ? fadeLen_ - fadePos_ : 0;  // reverse an in-progress fade-in without a jump
  fadingChains_ = changed;
  fade_ = Fade::Out;
}

/// Audio In (and the plugins' Microphone, labelled Audio Input): always on, the host input in
/// stereo at unity × gain. Its chain skips the master stage (see renderChain/render), so alone it
/// is a true bypass (owner review 2).
void Engine::addHostInput(const Block& b, int n) noexcept {
  static_assert(int{P::SourceAudioIn::gain} == int{P::SourceMicrophone::gain});
  if (!chainDirect_) {
    chainDirect_ = true;
    std::fill_n(hostL_.begin(), n, 0.0f);
    std::fill_n(hostR_.begin(), n, 0.0f);
  }
  if (!inLeft_ && !inRight_)
    return;
  const float g = static_cast<float>(b.params[P::SourceAudioIn::gain]);
  for (int i = 0; i < n; ++i) {
    const float l = inLeft_ ? inLeft_[inOffset_ + i] : 0.0f,
                r = inRight_ ? inRight_[inOffset_ + i] : l;
    hostL_[i] += l * g;
    hostR_[i] += r * g;
  }
}

void Engine::renderChain(int c, int n) noexcept BLOKDUST_NONBLOCKING {
  const auto r = audioChains_.chains[static_cast<std::size_t>(c)];
  std::fill_n(chainL_.begin(), n, 0.0f);
  chainDirect_ = false;
  chainStage_ = false;
  // Pre-effects (v1 LFObase): Vibrato/Scuzz LFOs drive every source's oscillator detune in this
  // chain, summed.
  bool detuned = false;
  for (int m = 0; m < r.count; ++m) {
    Block& b = blocks_[audioChains_.members[r.start + m]];
    if (!b.alive || (b.type != BlockType::FxVibrato && b.type != BlockType::FxScuzz))
      continue;
    if (!detuned) {
      std::fill_n(detune_.begin(), n, 0.0);
      detuned = true;
    }
    for (int i = 0; i < n; ++i)
      detune_[i] += b.lfo.next(*wavetables_);
  }
  for (int m = 0; m < r.count;
       ++m) {  // sources sum (mono, through Tone.Mono's −10 dB) into the chain
    Block& b = blocks_[audioChains_.members[r.start + m]];
    if (!b.alive)
      continue;
    switch (b.type) {
      case BlockType::SourceAudioIn:
        addHostInput(b, n);
        break;
      case BlockType::SourceMicrophone: {  // mic input summed to mono at v1's source level × gain
        if (hostInput_) {
          addHostInput(b, n);
          break;
        }  // the plugins' Audio Input: always on (PLUGIN-0002)
        // The website's is v1's Microphone (SPEC-SIMULATION-POWER-AND-PARTICLES R1a, CHG-0035):
        // muted until power, a key or a hit plays it, open while any of its voices sounds. A 5 ms
        // ramp each way keeps the cut from clicking.
        const double g = kSourceGain * b.params[P::SourceMicrophone::gain],
                     step = 1.0 / (0.005 * sampleRate_);
        for (int i = 0; i < n; ++i) {
          bool open = false;
          for (auto& vo : b.voices)
            if (vo.env.active()) {
              vo.env.next();
              open = true;
            }
          b.micGate = open ? std::min(1.0, b.micGate + step) : std::max(0.0, b.micGate - step);
          if (b.micGate == 0.0 || (!inLeft_ && !inRight_))
            continue;
          const double l = inLeft_ ? inLeft_[inOffset_ + i] : 0.0,
                       rr = inRight_ ? inRight_[inOffset_ + i] : l;
          chainL_[i] += static_cast<float>((l + rr) * 0.5 * g * b.micGate);
        }
        break;
      }
      case BlockType::SourceTone:
        for (int v = 0; v < kVoices; ++v) {
          Voice& vo = b.voices[static_cast<std::size_t>(v)];
          // Voice 0 free-runs like v1's always-started oscillators (phase never depends on
          // segmentation); the extra poly voices only advance while sounding.
          for (int i = 0; i < n; ++i) {
            if (vo.glideLeft > 0) {
              vo.pitch = --vo.glideLeft ? vo.pitch + vo.glideStep : vo.glideTo;
              applyPitch(b, vo);
            }
            if (!vo.env.active()) {
              if (vo.glideLeft > 0)
                continue;
              if (v == 0)
                vo.osc.skip(n - i);
              break;
            }
            double x = detuned ? vo.osc.next(detune_[i]) : vo.osc.next();
            if (vo.lpA < 1.0)
              x = vo.lpY += vo.lpA * (x - vo.lpY);  // MPE slide → brightness
            chainL_[i] += static_cast<float>(x * vo.env.next() * kSourceGain * glideGain(vo));
          }
        }
        break;
      case BlockType::SourceWavetable:  // CHG-0031: the Tone's voice rules, reading the TableBank
        for (int v = 0; v < kVoices; ++v) {
          Voice& vo = b.voices[static_cast<std::size_t>(v)];
          for (int i = 0; i < n; ++i) {
            if (vo.glideLeft > 0) {
              vo.pitch = --vo.glideLeft ? vo.pitch + vo.glideStep : vo.glideTo;
              applyPitch(b, vo);
            }
            if (!vo.env.active()) {
              if (vo.glideLeft > 0)
                continue;
              if (v == 0)
                vo.tosc.skip(n - i);
              break;
            }
            double x = detuned ? vo.tosc.next(detune_[i]) : vo.tosc.next();
            if (vo.lpA < 1.0)
              x = vo.lpY += vo.lpA * (x - vo.lpY);
            chainL_[i] += static_cast<float>(x * vo.env.next() * kSourceGain * glideGain(vo));
          }
        }
        break;
      case BlockType::SourceSample:
      case BlockType::SourceRecorder:
      case BlockType::SourceSampleGen: {
        // Tone.Simpler: plays from startPosition to endPosition; with loop, wraps loopEnd →
        // loopStart once reached. Reverse reads the region mirrored (v1 plays a reversed copy of
        // the buffer). Linear interpolation, (L+R)/2.
        const auto& pp = b.params;
        const double len = b.sampleFrames, sr0 = b.sampleRate;
        const double end = std::clamp(
            pp[P::SourceSample::endPosition] > 0 ? pp[P::SourceSample::endPosition] * sr0 : len,
            1.0, std::max(1.0, len));
        double ls = std::clamp(pp[P::SourceSample::loopStart] * sr0, 0.0, end - 1),
               le = std::clamp(pp[P::SourceSample::loopEnd] * sr0, 0.0, len);
        if (le <= ls)
          le = end;
        const bool loop = pp[P::SourceSample::loop] != 0.0,
                   rev = pp[P::SourceSample::reverse] != 0.0;
        // v1 Recorder sets Simpler volume to its `volume` param (Tone dB, default +20);
        // Sample/SampleGen never apply it.
        const double gain = kSourceGain * (b.type == BlockType::SourceRecorder
                                               ? dsp::toneDbToGain(pp[P::SourceRecorder::volume])
                                               : 1.0);
        for (auto& vo : b.voices) {
          if (!vo.samplePlaying || !b.sampleL) {
            for (int i = 0; i < n; ++i)
              if (vo.env.active())
                vo.env.next();
            continue;
          }
          for (int i = 0; i < n; ++i) {
            if (vo.glideLeft > 0)
              vo.pitch = --vo.glideLeft ? vo.pitch + vo.glideStep : vo.glideTo;
            if (!vo.samplePlaying)
              break;
            double pos = vo.playhead;
            if (rev)
              pos = len - 1.0 - pos;
            const auto k = static_cast<std::uint32_t>(std::clamp(pos, 0.0, len - 1.0));
            const double f = std::clamp(pos, 0.0, len - 1.0) - k;
            const std::uint32_t k1 = std::min<std::uint32_t>(k + 1, b.sampleFrames - 1);
            const double sl = b.sampleL[k] + f * (b.sampleL[k1] - b.sampleL[k]),
                         sr2 = b.sampleR[k] + f * (b.sampleR[k1] - b.sampleR[k]);
            const double e = vo.env.active() ? vo.env.next() : 0.0;
            chainL_[i] += static_cast<float>(0.5 * (sl + sr2) * e * gain * glideGain(vo));
            vo.playhead += vo.pitch;
            if (loop && vo.playhead >= le)
              vo.playhead = ls + std::fmod(vo.playhead - ls, std::max(1.0, le - ls));
            else if (!loop && vo.playhead >= end)
              vo.samplePlaying = false;
          }
        }
        break;
      }
      case BlockType::SourceGranular:
        renderGranular(b, n);
        break;
      case BlockType::SourceStage:  // its inner world's mix, in stereo, at the block's level
        if (b.poolIndex >= 0 && stages_[static_cast<std::size_t>(b.poolIndex)]) {
          if (!chainStage_) {
            chainStage_ = true;
            std::fill_n(stageL_.begin(), n, 0.0f);
            std::fill_n(stageR_.begin(), n, 0.0f);
          }
          const float* buf =
              stageBuf_.data() + static_cast<std::ptrdiff_t>(b.poolIndex) * 2 * kMaxSegment;
          const auto g = static_cast<float>(std::clamp(b.params[P::SourceStage::gain], 0.0, 4.0));
          for (int i = 0; i < n; ++i) {
            stageL_[i] += buf[i] * g;
            stageR_[i] += buf[kMaxSegment + i] * g;
          }
        }
        break;
      case BlockType::SourceNoise:
        for (int v = 0; v < kVoices; ++v) {
          Voice& vo = b.voices[static_cast<std::size_t>(v)];
          for (int i = 0; i < n; ++i) {
            if (v > 0 && !vo.env.active())
              break;  // voice 0 free-runs (golden renders); poly voices only while sounding
            const double x = vo.noise.next();
            if (vo.env.active())
              chainL_[i] += static_cast<float>(x * vo.env.next() * kSourceGain * glideGain(vo));
          }
        }
        break;
      default:
        break;
    }
  }
  std::copy_n(chainL_.begin(), n, chainR_.begin());
  if (chainStage_)
    for (int i = 0; i < n; ++i) {
      chainL_[i] += stageL_[i];
      chainR_[i] += stageR_[i];
    }
  if (chainDirect_) {
    // An Audio In chain skips the master stage, so its other sources take the master volume here,
    // and the host input joins at its own level: effects see the track as it is, and with no
    // effects it is passed through as is.
    const float mg = static_cast<float>(masterGain_);
    for (int i = 0; i < n; ++i) {
      chainL_[i] = chainL_[i] * mg + hostL_[i];
      chainR_[i] = chainR_[i] * mg + hostR_[i];
    }
  }
  // Post-effects in series, chain (DFS) order. Effects always run, even on silence: their state
  // (filter memory, reverb/delay tails, LFO phase) must evolve identically however the timeline is
  // segmented.
  for (int m = 0; m < r.count; ++m) {
    Block& b = blocks_[audioChains_.members[r.start + m]];
    if (!b.alive)
      continue;
    float* L = chainL_.data();
    float* R = chainR_.data();
    switch (b.type) {
      case BlockType::FxFilter:
        b.filter.process(L, R, n);
        if (b.filterLevel != 1.0f)
          for (int i = 0; i < n; ++i) {
            L[i] *= b.filterLevel;
            R[i] *= b.filterLevel;
          }
        break;
      case BlockType::FxEq:
        b.eq.process(L, R, n);
        break;
      case BlockType::FxVolume:
        b.volume.process(L, R, n);
        break;
      case BlockType::FxDistortion:
        b.distortion.process(L, R, n);
        break;
      case BlockType::FxBitCrusher:
        b.crusher.process(L, R, n);
        break;
      case BlockType::FxPhaser:
        b.phaser.process(L, R, n, *wavetables_);
        break;
      case BlockType::FxChorus:
        b.chorus.process(L, R, n, *wavetables_);
        break;
      case BlockType::FxReverb:
        b.reverb.process(L, R, n);
        break;
      case BlockType::FxStereoDelay:
        b.pingpong.process(L, R, n);
        break;
      case BlockType::FxAutoWah:
        b.autowah.process(L, R, n);
        break;
      case BlockType::FxChomp:
        b.chomp.process(L, R, n);
        break;
      case BlockType::FxChopper:
        b.chopper.process(L, R, n, *wavetables_);
        break;
      case BlockType::FxPitchShifter:
        b.pitchshift.process(L, R, n, *wavetables_);
        break;
      case BlockType::FxCompressor:
        if (b.poolIndex >= 0) {  // CHG-0014: Chromium's DynamicsCompressor (as the master bus),
                                 // then the Makeup gain
          auto& comp = compressors_[static_cast<std::size_t>(b.poolIndex)];
          const auto makeup = static_cast<float>(
              dmath::exp10(std::clamp(b.params[P::FxCompressor::makeup], -24.0, 24.0) / 20.0));
          float peak = 0.0f;
          for (int i = 0; i < n; ++i) {
            peak = std::max(peak, std::max(std::abs(L[i]), std::abs(R[i])));
            comp.process(L[i], R[i]);
            L[i] *= makeup;
            R[i] *= makeup;
          }
          // The panel's meter: the input's peak in dB, falling 20 dB/s between peaks, and the gain
          // reduction now.
          const float db = peak > 1e-5f ? static_cast<float>(20.0 * dmath::log10(peak)) : -100.0f;
          b.mon[0] = std::max(
              db, b.mon[0] - 20.0f * static_cast<float>(n) / static_cast<float>(sampleRate_));
          b.mon[1] = static_cast<float>(comp.reductionDb());
        }
        break;
      case BlockType::FxConvolver:
        if (b.poolIndex >= 0) {
          dsp::EqualPower mix;
          mix.set(b.params[P::FxConvolver::mix]);
          const auto& k = b.userImpulse ? userImpulses_[static_cast<std::size_t>(b.poolIndex)]
                                        : *defaultImpulse_;
          convolvers_[static_cast<std::size_t>(b.poolIndex)].process(k, L, R, n, mix.dry, mix.wet);
        }
        break;
      default:
        break;
    }
  }
}

void Engine::render(float* left, float* right, int n) noexcept BLOKDUST_NONBLOCKING {
  std::fill_n(mixL_.begin(), n, 0.0f);
  std::fill_n(mixR_.begin(), n, 0.0f);
  bool anyDirect = false;
  // Inner worlds (CHG-0021) render the same samples, whether or not their block is in a chain yet:
  // their clocks never drift from this one.
  if (!child_)
    for (int i = 0; i < kMaxStages; ++i)
      if (Engine* inner = stages_[static_cast<std::size_t>(i)]) {
        float* buf = stageBuf_.data() + static_cast<std::ptrdiff_t>(i) * 2 * kMaxSegment;
        // The host input (the Microphone, Audio In) reaches blocks inside a Stage too.
        inner->process(inLeft_ ? inLeft_ + inOffset_ : nullptr,
                       inRight_ ? inRight_ + inOffset_ : nullptr, buf, buf + kMaxSegment,
                       static_cast<std::uint32_t>(n));
        inner->clearEvents();
      }
  // Sound Lasers (CHG-0016): which chains each one hears (those of the sources connected to it).
  std::array<std::bitset<kMaxBlocks>, kMaxListeners> heard;
  bool listening = false;
  for (int i = 0; i < kMaxListeners; ++i) {
    const int s = listenerOwner_[static_cast<std::size_t>(i)];
    if (s < 0)
      continue;
    listening = true;
    std::fill_n(listenBuf_.begin() + static_cast<std::ptrdiff_t>(i) * kMaxSegment, n, 0.0f);
    const auto& row = graph_.row(s);
    for (int k = 0; k < orderCount_; ++k) {
      const int src = order_[k], c = audioChains_.chainOf[static_cast<std::size_t>(src)];
      if (row[static_cast<std::size_t>(src)] && c >= 0)
        heard[static_cast<std::size_t>(i)][static_cast<std::size_t>(c)] = true;
    }
  }
  for (int c = 0; c < audioChains_.chainCount; ++c) {
    renderChain(c, n);
    if (listening)
      for (int i = 0; i < kMaxListeners; ++i) {  // as it sounds: after the chain's effects, mono
        if (listenerOwner_[static_cast<std::size_t>(i)] < 0 ||
            !heard[static_cast<std::size_t>(i)][static_cast<std::size_t>(c)])
          continue;
        float* buf = listenBuf_.data() + static_cast<std::ptrdiff_t>(i) * kMaxSegment;
        for (int k = 0; k < n; ++k)
          buf[k] += 0.5f * (chainL_[k] + chainR_[k]);
      }
    if (chainDirect_ && !anyDirect) {
      anyDirect = true;
      std::fill_n(directL_.begin(), n, 0.0f);
      std::fill_n(directR_.begin(), n, 0.0f);
    }
    const bool fading = fade_ != Fade::Idle && fadingChains_[static_cast<std::size_t>(c)];
    for (int i = 0; i < n; ++i) {
      double g = 1.0;
      if (fading) {
        const double t = static_cast<double>(fadePos_ + i) / fadeLen_;
        g = fade_ == Fade::Out ? 1.0 - t : t;
      }
      float* toL = chainDirect_ ? directL_.data() : mixL_.data();
      float* toR = chainDirect_ ? directR_.data() : mixR_.data();
      if (fading) {
        toL[i] += static_cast<float>(chainL_[i] * g);
        toR[i] += static_cast<float>(chainR_[i] * g);
      } else {
        toL[i] += chainL_[i];
        toR[i] += chainR_[i];
      }
    }
  }
  if (listening)
    listen(n);
  // Pre-effect LFOs outside any chain keep their phase (Tone LFOs run from block creation).
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if ((b.type == BlockType::FxVibrato || b.type == BlockType::FxScuzz) &&
        audioChains_.chainOf[order_[k]] < 0)
      b.lfo.skip(n);
  }
  for (int i = 0; i < n; ++i) {
    // v1 order: chains -> master compressor (Chromium DynamicsCompressor) -> master volume.
    float l = mixL_[i], r = mixR_[i];
    if (useCompressor_)
      compressor_.process(l, r);
    left[i] = static_cast<float>(l * masterGain_);
    right[i] = static_cast<float>(r * masterGain_);
    if (anyDirect) {
      left[i] += directL_[i];
      right[i] += directR_[i];
    }
  }
  if (fade_ != Fade::Idle) {
    fadePos_ += n;
    if (fadePos_ >= fadeLen_) {
      if (fade_ == Fade::Out)
        switchRouting();
      else {
        fade_ = Fade::Idle;
        fadePos_ = 0;
        fadingChains_.reset();
      }
    }
  }
}

/// What each Sound Laser heard this segment, through its band filter, into its level: the peak,
/// falling by half every 35 ms or so (a 50 ms time constant). Per sample, so it does not depend on
/// how the timeline is cut into segments.
void Engine::listen(int n) noexcept {
  for (int i = 0; i < kMaxListeners; ++i) {
    const int s = listenerOwner_[static_cast<std::size_t>(i)];
    if (s < 0)
      continue;
    Block& l = blocks_[static_cast<std::size_t>(s)];
    const float* buf = listenBuf_.data() + static_cast<std::ptrdiff_t>(i) * kMaxSegment;
    const bool filtered = std::lround(l.params[P::PowerSoundLaser::band]) != 0;
    double env = l.listenEnv;
    for (int k = 0; k < n; ++k) {
      float x = buf[k];
      if (filtered)
        x = l.eq.l[1].process(l.eq.l[0].process(x));
      env = std::max(static_cast<double>(std::abs(x)), env * listenDecay_);
    }
    l.listenEnv = env < 1e-30 ? 0.0 : env;
  }
}

void Engine::process(float* left, float* right,
                     std::uint32_t frames) noexcept BLOKDUST_NONBLOCKING {
  process(nullptr, nullptr, left, right, frames);
}

void Engine::process(const float* inLeft, const float* inRight, float* left, float* right,
                     std::uint32_t frames) noexcept BLOKDUST_NONBLOCKING {
  inLeft_ = inLeft;
  inRight_ = inRight;
  std::uint32_t done = 0;
  while (done < frames) {
    const std::int64_t nextTick = tickSample(tick_);
    if (sample_ == nextTick) {
      applyDueCommands();
      runTick();
      ++tick_;
      continue;
    }
    if (routingDirty_)
      beginRoutingFade();
    std::int64_t limit = kMaxSegment;
    if (fade_ != Fade::Idle)
      limit = std::min<std::int64_t>(limit, fadeLen_ - fadePos_);  // switch exactly at the fade end
    const auto len = static_cast<int>(std::min<std::int64_t>(
        {static_cast<std::int64_t>(frames - done), nextTick - sample_, limit}));
    inOffset_ = static_cast<int>(done);
    render(left + done, right + done, len);
    done += static_cast<std::uint32_t>(len);
    sample_ += len;
  }
}

}  // namespace blokdust
