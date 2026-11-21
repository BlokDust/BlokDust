// Engine: commands from the UI and host, applied at their sample (configureDsp, apply).
#include "engine_internal.hpp"

namespace blokdust {

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
    case BlockType::SourceRecorder: case BlockType::SourceSampleGen: case BlockType::SourceGranular:
    case BlockType::SourceWavetable: {
      const int slot = static_cast<int>(&b - blocks_.data());
      for (int v = 0; v < kVoices; ++v) {
        Voice& vo = b.voices[static_cast<std::size_t>(v)];
        if (first) vo.env.configure({}, sr);
        if (b.type == BlockType::SourceTone) vo.osc.setWaveform(static_cast<dsp::Waveform>(std::clamp(static_cast<int>(p[P::SourceTone::waveform]), 0, 3)));
        if (b.type == BlockType::SourceWavetable) {  // CHG-0031: a new block starts where it is set; later moves glide
          vo.tosc.setTable(std::clamp(static_cast<int>(std::lround(p[P::SourceWavetable::table])), 0, dsp::TableBank::kTables - 1));
          vo.tosc.setGlide(gainGlide_);
          vo.tosc.setPosition(p[P::SourceWavetable::position], first);
        }
        if (b.type == BlockType::SourceNoise) vo.noise.setType(static_cast<int>(p[P::SourceNoise::waveform]));
        // Position only moves the read point: no re-pitch, so an LFO on it never cuts a glide short.
        if (b.type == BlockType::SourceWavetable && b.lastParam == P::SourceWavetable::position) continue;
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
      if (on) for (int k = 0; k < orderCount_; ++k) { blocks_[order_[k]].counterStep = 0; blocks_[order_[k]].counterFired = false; }  // Counters start over, off (R2c, R2d)
      if (!on) {  // everything the world was powering lets go at once
        for (int k = 0; k < orderCount_; ++k) {
          Block& b = blocks_[order_[k]];
          b.pulsePower = 0;
          b.pulseDelayCount = 0;  // a Pulse's waiting hits go too (R2b)
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
    case Command::Type::Reset: {  // R2c: the Counter panel's Reset
      if (c.id == kInvalidBlock) {  // R1b: the whole world starts over (CLEAR, opening a patch): no particles left flying
        particleCount_ = 0;
        for (Engine* inner : stages_) if (inner) inner->applyNow(Command::reset(kInvalidBlock));
        break;
      }
      const int slot = slotOf(c.id);
      if (slot >= 0) { blocks_[slot].counterStep = 0; blocks_[slot].counterFired = false; recomputeStaticPower(); }
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
/// A controller's Mono/Poly. Stage In has no settings of its own: it plays as the controller outside is set (owner,
/// 2026-11-20), taken with each note sent in (outsideKeys_).

}  // namespace blokdust
