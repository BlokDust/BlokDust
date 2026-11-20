// Engine: notes from controllers: keyboards, MIDI, Touchpad, Stage In; voices on and off.
#include "engine_internal.hpp"

namespace blokdust {

bool Engine::polyOf(const Block& c) const noexcept {
  if (c.type == BlockType::InputStageIn) return outsideKeys_.poly;
  return c.params[P::InputComputerKeyboard::isPolyphonic] != 0.0 || c.params[P::InputComputerKeyboard::polyphonic] != 0.0;
}
/// The outside controller's settings for Stage In; a change re-sets the voices of what it plays (as a switch would).
void Engine::setOutsideKeys(const OutsideKeys& k) noexcept {
  const bool same = k.poly == outsideKeys_.poly && k.pitchOnly == outsideKeys_.pitchOnly;
  outsideKeys_ = k;
  if (!same) for (int i = 0; i < orderCount_; ++i) refreshVoices(order_[i]);
}
/// A controller's Glide (seconds), Stage In's from outside.
double Engine::glideOf(const Block& c) const noexcept {
  return c.type == BlockType::InputStageIn ? outsideKeys_.glide : std::max(0.0, c.params[P::InputComputerKeyboard::glide]);
}

/// v1 Controller.NoteOn/NoteOff: the controller messages every connected source with its id, the key, its polyphony
/// and glide (computer keyboard and MIDI controller share Keyboard's params).
/// MIDI Input's channel filter (CHG-0004): Omni (0) or 1–16; with MPE on, every channel (the zone's member channels
/// are chosen by the host's MPE parser). The computer keyboard has no channel.
bool Engine::acceptsChannel(const Block& ctrl, int channel) noexcept {
  if (ctrl.type != BlockType::InputMidiController) return true;
  const int want = static_cast<int>(ctrl.params[P::InputMidiController::channel]);
  return ctrl.params[P::InputMidiController::mpe] != 0.0 || want <= 0 || want == channel + 1;
}

/// A keyboard's key on a connected Emitter or Laser (owner review 2, beyond v1): held keys power it, like a Toggle,
/// until every key is let go. Keys never aim it (owner, 2026-11-20): it keeps its own Angle. Every key pressed fires
/// an Emitter, legato too (CHG-0009); keys pressed together fire it once.
void Engine::keyAim(Block& b, int note, bool down) noexcept {
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
    if (b.type == BlockType::PowerEmitter) b.keyPressed = true;
  }
  b.keyPower = b.keyCount > 0 ? 1 : 0;
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
    inner->setOutsideKeys({glideOf(ctrl), polyOf(ctrl), keysSetPitch(ctrl)});  // its Stage In plays as this one is set
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
      if (row[s] && blocks_[s].kind() == BlockKind::PowerSource) { keyAim(blocks_[static_cast<std::size_t>(s)], c.param, c.type == Command::Type::NoteOn); continue; }
      if (!row[s] || blocks_[s].kind() != BlockKind::AudioSource || blocks_[s].type == BlockType::SourceStage) continue;
      if (blocks_[s].arranged) {  // CHG-0017: the key joins or leaves the notes this source is given
        arrangedKey(s, ctrl, c.param, ch, c.type == Command::Type::NoteOn);
        if (c.type != Command::Type::NoteOn) continue;
      } else {
      if (c.type != Command::Type::NoteOn) { voiceOff(s, ctrl.id, c.param, ch); continue; }
      voiceOn(s, ctrl.id, c.param, polyOf(ctrl), glideOf(ctrl), true, ch);
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
          if (isOscillator(b.type)) {
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
        setPitch(slot, v, c >= 0 ? glideOf(blocks_[static_cast<std::size_t>(c)]) : 0.0);
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

}  // namespace blokdust
