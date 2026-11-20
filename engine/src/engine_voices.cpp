// Engine: LFOs, arpeggiator steps, pitch and voice counts, topology and static power.
#include "engine_internal.hpp"

namespace blokdust {

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
  if (isOscillator(b.type)) {
    static_assert(P::SourceTone::transpose + 1 == P::SourceTone::fine && P::SourceWavetable::transpose + 1 == P::SourceWavetable::fine, "Note, Fine");
    const int note = b.type == BlockType::SourceTone ? static_cast<int>(P::SourceTone::transpose) : static_cast<int>(P::SourceWavetable::transpose);
    const double semis = p[static_cast<std::size_t>(note)] + p[static_cast<std::size_t>(note) + 1];
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
  else if (b.type == BlockType::SourceWavetable) vo.tosc.setFrequency(vo.pitch, *tables_, sampleRate_);
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
    b.ownVoicing = {}; b.lastChordCount = 0;
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
    const bool powers = (p.type == BlockType::PowerPower && p.gapUntil == 0 && !p.beamCut) ||  // not while a hit cuts it
                        (p.type == BlockType::PowerToggle && p.params[P::PowerToggle::logic] != 0.0) ||
                        ((p.type == BlockType::PowerCounter || p.type == BlockType::PowerChance) && p.counterFired);  // R2c, R2d
    if (!powers) continue;
    const auto& row = graph_.row(order_[k]);
    for (int i = 0; i < orderCount_; ++i) {
      const int s = order_[i];
      if (row[s] && takesPower(blocks_[s].kind())) blocks_[s].staticPower++;
    }
  }
}

}  // namespace blokdust
