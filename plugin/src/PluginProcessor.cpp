#include "PluginProcessor.h"
#include "PatchFiles.h"

#include <BinaryData.h>

#include "PluginEditor.h"
#include "blokdust/patch_loader.hpp"

namespace blokdust::plugin {

namespace {
#if BLOKDUST_FX  // BlokDust FX (PLUGIN-0002): audio in → Audio In block; start patch = web/src/demo/fx.patch.json (Audio In alone);
                  // the instrument starts empty: web/src/demo/plugin-start.patch.json (CHG-0010)
constexpr bool kFx = true;
#else
constexpr bool kFx = false;
#endif
}  // namespace

juce::AudioProcessor::BusesProperties BlokDustProcessor::buses() {
  auto b = BusesProperties();
  // FX: the track's audio. Instrument: an optional side-chain (off until the host enables it), which also feeds the
  // Audio Input block (CHG-0004 3.3/3.4).
  if (kFx) b = b.withInput("Input", juce::AudioChannelSet::stereo(), true);
  // Every format, the AU too (owner, Logic, 2026-11-12): without this input Logic 11 lists the instrument but never opens
  // its editor. (It went missing from AU Instruments because of an old 2.0.0 copy in /Library, not this bus.)
  else b = b.withInput("Side Chain", juce::AudioChannelSet::stereo(), false);
  return b.withOutput("Output", juce::AudioChannelSet::stereo(), true);
}

BlokDustProcessor::BlokDustProcessor() : AudioProcessor(buses()) {
  systemLog(juce::String(kFx ? "fx" : "instrument") + ": processor created (" + getWrapperTypeDescription(wrapperType) + ", "
            + juce::String(getTotalNumInputChannels()) + " in / " + juce::String(getTotalNumOutputChannels()) + " out)");
#if JUCE_IOS
  // Where patches live on iPad, and how many: the Simulator test checks the app and the extension share them.
  systemLog(juce::String("storage: ") + patchfiles::rootKind() + ", " + juce::String(patchfiles::list(patchfiles::folder()).size()) + " patches");
#endif
  recDrain_.f = [this] { drainRecording(); };
  patch_ = kFx ? nlohmann::json::parse(BinaryData::fx_patch_json, BinaryData::fx_patch_json + BinaryData::fx_patch_jsonSize)
               : nlohmann::json::parse(BinaryData::pluginstart_patch_json, BinaryData::pluginstart_patch_json + BinaryData::pluginstart_patch_jsonSize);
  // The standalone app's first launch (owner, 2026-11-13, CHG-0013): the Rotating Sequencer, a simple patch to start
  // from. JUCE's standalone wrapper restores the last session over it on every later launch (setStateInformation).
  if (!kFx && wrapperType == wrapperType_Standalone) {
    int size = 0;
    for (int i = 0; i < BinaryData::namedResourceListSize; ++i)
      if (juce::String(BinaryData::originalFilenames[i]) == "04-rotating-sequencer.blokdust")
        if (const char* d = BinaryData::getNamedResource(BinaryData::namedResourceList[i], size); d && size > 0)
          patch_ = nlohmann::json::parse(d, d + size);
  }
  // Dust 1–8 (PLUGIN-0003): fixed generic host parameters, mapped onto block params by the patch's "automation" list.
  for (int i = 0; i < kDustSlots; ++i) {
    auto p = std::make_unique<DustParameter>(i + 1);
    dustParams_[static_cast<std::size_t>(i)] = p.get();
    addParameter(p.release());
  }
}

bool BlokDustProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
  const auto& out = layouts.getMainOutputChannelSet();
  if (out != juce::AudioChannelSet::stereo() && out != juce::AudioChannelSet::mono()) return false;
  const auto& in = layouts.getMainInputChannelSet();
  if (kFx) return in == out;
  return in.isDisabled() || in == juce::AudioChannelSet::stereo() || in == juce::AudioChannelSet::mono();
}

void BlokDustProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
  systemLog(juce::String(kFx ? "fx" : "instrument") + ": prepareToPlay " + juce::String(sampleRate) + " Hz, " + juce::String(samplesPerBlock)
            + " frames, " + juce::String(getTotalNumInputChannels()) + " in / " + juce::String(getTotalNumOutputChannels()) + " out");
  sampleRate_ = sampleRate;
  scratch_.assign(static_cast<std::size_t>(std::max(samplesPerBlock, 4096)), 0.0f);
  // ~60 a second, as the web worklet sends (owner, iPad: 30 looked jumpy, 2026-11-16); a large block sends one each.
  samplesPerSnapshot_ = std::max(1, static_cast<int>(sampleRate / 60.0));
  idleBuf_.setSize(2, 2048);
  recFifoBuf_.setSize(2, static_cast<int>(sampleRate * 4));  // 4 s between drains (the drain runs at 20 Hz)
  recFifo_.setTotalSize(recFifoBuf_.getNumSamples());
  dryBuf_.setSize(2, std::max(samplesPerBlock, 4096));
  rebuildEngine();
}

void BlokDustProcessor::rebuildEngine() {
  if (sampleRate_ <= 0.0) return;
  patch::Loaded loaded;
  std::string err;
  if (!patch::load(patch_, loaded, err)) { DBG("BlokDust: invalid patch: " << err); loaded = {}; }
  auto next = std::make_unique<Engine>(EngineConfig{static_cast<int>(sampleRate_ + 0.5), loaded.seed, true, /*hostInput=*/true});
  for (const auto& c : loaded.commands) next->push(c);
  next->prime();  // blocks exist now, so samples attach before the first audio block (CHG-0004 3.6)
  idToKey_.clear();
  for (const auto& [key, id] : loaded.ids) idToKey_[id] = key;
  suspendProcessing(true);  // takes the callback lock: the audio thread is not inside processBlock while we swap
  engine_.swap(next);
  suspendProcessing(false);
  rebuildDust();
  attachSamples();
}

void BlokDustProcessor::rebuildDust() {
  std::map<std::string, BlockId> keyToId;
  for (const auto& [id, key] : idToKey_) keyToId[key] = id;
  // "automation": [{ "slot": 1..8, "block": "<patch id>", "param": "<key>" }] (SPEC-PATCH-FORMAT-V2 R5a)
  std::array<DustSlot, kDustSlots> dust{};
  if (patch_.contains("automation") && patch_["automation"].is_array()) {
    for (const auto& a : patch_["automation"]) {
      const int slot = a.value("slot", 0) - 1;
      const auto it = keyToId.find(a.value("block", std::string{}));
      if (slot < 0 || slot >= kDustSlots || it == keyToId.end()) continue;
      BlockType t{};
      for (const auto& b : patch_["blocks"]) if (b.value("id", std::string{}) == it->first) gen::findBlockType(b.value("type", std::string{}), t);
      const auto& inf = gen::info(t);
      for (std::uint8_t p = 0; p < inf.paramCount; ++p)
        if (inf.params[p].key == a.value("param", std::string{}) && inf.params[p].transform != gen::UiTransform::None)
          dust[static_cast<std::size_t>(slot)] = DustSlot{true, it->second, t, p, -1.0f, a.contains("cc") && a["cc"].is_number() ? a["cc"].get<int>() : -1};  // last = −1: apply on first block
    }
  }
  suspendProcessing(true);
  dust_ = dust;
  suspendProcessing(false);
  // Lane names follow the assignments where the host shows them ("Dust 1 · Filter · Gain").
  for (int i = 0; i < kDustSlots; ++i) {
    const auto& d = dust[static_cast<std::size_t>(i)];
    juce::String target;
    if (d.active) {
      const auto& inf = gen::info(d.type);
      auto block = juce::String(std::string(inf.v1Type.empty() ? inf.id.substr(inf.id.find('.') + 1) : inf.v1Type));
      auto key = juce::String(std::string(inf.params[d.param].key)), words = juce::String();
      for (int c = 0; c < key.length(); ++c) { const auto ch = key[c]; if (c > 0 && juce::CharacterFunctions::isUpperCase(ch)) words << ' '; words << (c == 0 ? juce::CharacterFunctions::toUpperCase(ch) : ch); }
      target = block + " " + juce::String(juce::CharPointer_UTF8("\xc2\xb7")) + " " + words;
    }
    dustParams_[static_cast<std::size_t>(i)]->setTarget(target);
  }
  updateHostDisplay(ChangeDetails().withParameterInfoChanged(true));
}

void BlokDustProcessor::setAutomation(int slot, BlockId id, const std::string& param) {
  const auto key = idToKey_.find(id);
  if (key == idToKey_.end()) return;
  auto list = patch_.contains("automation") && patch_["automation"].is_array() ? patch_["automation"] : nlohmann::json::array();
  auto kept = nlohmann::json::array();
  for (const auto& a : list)
    if (a.value("slot", 0) != slot && !(a.value("block", std::string{}) == key->second && a.value("param", std::string{}) == param)) kept.push_back(a);
  if (slot >= 1 && slot <= kDustSlots) kept.push_back({{"slot", slot}, {"block", key->second}, {"param", param}});
  patch_["automation"] = kept;
  rebuildDust();
}

void BlokDustProcessor::applyDust(std::size_t i, float v) noexcept {
  auto& s = dust_[i];
  if (!s.active || juce::exactlyEqual(v, s.last)) return;
  s.last = v;
  double mapped = 0.0;
  if (Engine::mapAutomation(s.type, s.param, v, mapped)) {
    engine_->applyNow(Command::setParam(s.block, s.param, mapped));
    dustValue_[i].store(mapped, std::memory_order_relaxed);
    dustMoved_[i].store(true, std::memory_order_release);
  }
}

void BlokDustProcessor::flushDust() {
  for (std::size_t i = 0; i < dust_.size(); ++i) {
    if (!dustMoved_[i].exchange(false, std::memory_order_acquire)) continue;
    const auto& s = dust_[i];
    if (!s.active) continue;
    const double v = dustValue_[i].load(std::memory_order_relaxed);
    const auto key = std::string(gen::info(s.type).params[s.param].key);
    if (const auto k = idToKey_.find(s.block); k != idToKey_.end())
      if (auto* b = blockJson(k->second)) (*b)["params"][key] = v;
    // One entry per block param: the newest value wins.
    auto it = std::find_if(paramUpdates_.begin(), paramUpdates_.end(), [&](const ParamUpdate& u) { return u.id == s.block && u.param == key; });
    if (it != paramUpdates_.end()) it->value = v; else paramUpdates_.push_back({s.block, key, v});
  }
}

void BlokDustProcessor::syncToggles(const Snapshot& s) {
  // Edge-triggered: only a change the engine made since the last snapshot is written, so a switch the user just set
  // (already in the patch, not yet in the engine) is never undone by a snapshot from before it applied.
  std::map<BlockId, bool> now;
  for (int i = 0; i < s.toggleCount; ++i) now[s.toggles[static_cast<std::size_t>(i)]] = s.toggleOn[static_cast<std::size_t>(i)] != 0;
  for (const auto& [id, on] : now) {
    const auto was = togglesSeen_.find(id);
    if (was == togglesSeen_.end() || was->second == on) continue;
    const auto k = idToKey_.find(id);
    auto* b = k == idToKey_.end() ? nullptr : blockJson(k->second);
    if (!b) continue;
    (*b)["params"]["logic"] = on;
    auto it = std::find_if(paramUpdates_.begin(), paramUpdates_.end(), [&](const ParamUpdate& u) { return u.id == id && u.param == "logic"; });
    if (it != paramUpdates_.end()) it->value = on ? 1.0 : 0.0; else paramUpdates_.push_back({id, "logic", on ? 1.0 : 0.0});
  }
  togglesSeen_ = std::move(now);
}

void BlokDustProcessor::handleAsyncUpdate() {
  const int slot = learnedSlot_.exchange(0), cc = learnedCc_.exchange(-1);
  if (slot < 1 || cc < 0 || !patch_.contains("automation")) return;
  for (auto& a : patch_["automation"]) if (a.value("slot", 0) == slot) a["cc"] = cc;
  rebuildDust();
  if (onCcLearned) onCcLearned(slot, cc);
}

void BlokDustProcessor::applyAutomation() noexcept {
  for (std::size_t i = 0; i < dust_.size(); ++i) applyDust(i, dustParams_[i]->get());
}

void BlokDustProcessor::render(juce::AudioBuffer<float>& buffer, int from, int to) noexcept {
  float* left = buffer.getWritePointer(0);
  for (int done = from; done < to;) {
    const int chunk = std::min(to - done, static_cast<int>(scratch_.size()));
    float* right = buffer.getNumChannels() > 1 ? buffer.getWritePointer(1) + done : scratch_.data();
    // FX input, or the instrument's enabled side-chain: the host's input is in the same buffer; the engine reads each
    // segment's input before writing its output.
    const bool in = getTotalNumInputChannels() > 0;
    const float* inL = in ? left + done : nullptr;
    const float* inR = in ? (getTotalNumInputChannels() > 1 && buffer.getNumChannels() > 1 ? buffer.getReadPointer(1) + done : inL) : nullptr;
    engine_->process(inL, inR, left + done, right, static_cast<std::uint32_t>(chunk));
    if (recording_.load(std::memory_order_relaxed)) captureRecording(left + done, right, chunk);
    done += chunk;
  }
}

void BlokDustProcessor::processBlockBypassed(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
  const int n = buffer.getNumSamples(), ch = std::min(buffer.getNumChannels(), dryBuf_.getNumChannels());
  if (n > dryBuf_.getNumSamples()) { buffer.clear(); return; }  // larger than prepared: stay silent, never allocate
  for (int c = 0; c < ch; ++c) dryBuf_.copyFrom(c, 0, buffer, c, 0, n);
  processBlock(buffer, midi);
  buffer.clear();
  if (kFx) for (int c = 0; c < ch; ++c) buffer.copyFrom(c, 0, dryBuf_, c, 0, n);
}

void BlokDustProcessor::idleTick() noexcept {
  const double now = juce::Time::getMillisecondCounterHiRes();
  const double last = lastProcessMs_.load();
  if (!engine_ || sampleRate_ <= 0.0 || (last > 0.0 && now - last < 250.0)) { lastIdleMs_ = now; return; }
  const double since = lastIdleMs_ > 0.0 ? std::clamp(now - lastIdleMs_, 0.0, 100.0) : 1000.0 / 30.0;
  lastIdleMs_ = now;
  auto frames = static_cast<int>(since * sampleRate_ / 1000.0);
  const juce::ScopedLock lock(getCallbackLock());  // the host's audio thread takes it around processBlock
  while (frames > 0) {
    const int n = std::min(frames, idleBuf_.getNumSamples());
    engine_->process(nullptr, nullptr, idleBuf_.getWritePointer(0), idleBuf_.getWritePointer(1), static_cast<std::uint32_t>(n));
    frames -= n;
  }
  engine_->clearEvents();
  publishSnapshot();
}

void BlokDustProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
  juce::ScopedNoDenormals noDenormals;  // safe: engine output is independent of FTZ (engine/tests/test_ftz.cpp)
  lastProcessMs_.store(juce::Time::getMillisecondCounterHiRes());
  const int n = buffer.getNumSamples();
  if (!engine_) { buffer.clear(); return; }
  applyAutomation();
  // Host tempo and transport (SIMULATION-0003, CHG-0004 3.5): synced emitters and pulses follow the DAW's tempo, and
  // lock to its beat position while it plays. Stopped, they keep running at its tempo.
  if (auto* ph = getPlayHead()) if (const auto pos = ph->getPosition()) {
    const double bpm = pos->getBpm().orFallback(lastBpm_ > 0 ? lastBpm_ : 120.0);
    const auto ppq = pos->getPpqPosition();
    // Play pressed (owner review 2): the world resyncs to the transport, so every take from a position is the same.
    const bool playing = pos->getIsPlaying() && ppq.hasValue();
    if (playing) engine_->applyNow(Command::tempo(bpm, std::max(0.0, *ppq), -1, /*transportStart=*/!hostPlaying_));
    else if (bpm != lastBpm_) engine_->applyNow(Command::tempo(bpm));
    lastBpm_ = bpm;
    hostPlaying_ = playing;
  }
  // Host MIDI → each MIDI Input block through its own MPE/MIDI parser (PLUGIN-0004; channel filter in the engine),
  // split at each event's sample offset (applied at the next tick boundary).
  midiRouter_.sync(*engine_);
  int pos = 0;
  for (const auto meta : midi) {
    const int at = std::clamp(meta.samplePosition, 0, n);
    if (at > pos) { render(buffer, pos, at); pos = at; }
    const auto* d = meta.data;
    if (meta.numBytes < 2 || d[0] < 0x80 || d[0] >= 0xF0) continue;
    if ((d[0] & 0xF0) == 0xB0 && meta.numBytes > 2) {  // MIDI CC → Dust (CHG-0004 3.9): learn, then drive the bound slots
      if (const int learn = learnSlot_.exchange(0); learn >= 1) { learnedSlot_.store(learn); learnedCc_.store(d[1] & 0x7F); triggerAsyncUpdate(); }
      for (std::size_t i = 0; i < dust_.size(); ++i)
        if (dust_[i].active && dust_[i].cc == (d[1] & 0x7F)) {
          const float v = (d[2] & 0x7F) / 127.0f;
          applyDust(i, v);
          dustParams_[i]->setValueNotifyingHost(v);  // the lane follows the knob
        }
    }
    midiRouter_.message(d[0], d[1] & 0x7F, meta.numBytes > 2 ? (d[2] & 0x7F) : 0, -1, [this](const Command& c) { engine_->applyNow(c); });
    // Computer Keyboard blocks play from the DAW's computer keyboard (Logic's Musical Typing, Live's Computer MIDI
    // Keyboard), which arrives as host MIDI: in a DAW the keys belong to the host (owner, CHG-0004).
    const int kind = d[0] & 0xF0, key = d[1] & 0x7F, vel = meta.numBytes > 2 ? (d[2] & 0x7F) : 0;
    if (kind == 0x90 && vel > 0) engine_->applyNow(Command::noteOn(BlockType::InputComputerKeyboard, static_cast<std::uint8_t>(key), vel / 127.0));
    else if (kind == 0x80 || kind == 0x90) engine_->applyNow(Command::noteOff(BlockType::InputComputerKeyboard, static_cast<std::uint8_t>(key)));
  }
  render(buffer, pos, n);
  engine_->clearEvents();
  if ((samplesSinceSnapshot_ += n) >= samplesPerSnapshot_) { samplesSinceSnapshot_ %= samplesPerSnapshot_; publishSnapshot(); }
}

void BlokDustProcessor::publishSnapshot() noexcept {
  auto& s = snapshots_.writeBuffer();
  s.seq = ++snapshotSeq_;
  const auto parts = engine_->particles();
  s.particleCount = static_cast<int>(std::min<std::size_t>(parts.size(), kMaxParticles));
  for (int i = 0; i < s.particleCount; ++i) {
    s.particles[static_cast<std::size_t>(i * 3)] = static_cast<float>(parts[static_cast<std::size_t>(i)].x);
    s.particles[static_cast<std::size_t>(i * 3 + 1)] = static_cast<float>(parts[static_cast<std::size_t>(i)].y);
    s.particles[static_cast<std::size_t>(i * 3 + 2)] = parts[static_cast<std::size_t>(i)].size;
  }
  const auto& blocks = engine_->blocks();
  s.poweredCount = 0;
  for (int i = 0; i < kMaxBlocks; ++i) {
    if (!blocks[static_cast<std::size_t>(i)].alive) continue;
    if (blocks[static_cast<std::size_t>(i)].power() > 0) s.powered[static_cast<std::size_t>(s.poweredCount++)] = blocks[static_cast<std::size_t>(i)].id;
  }
  s.toggleCount = 0;
  for (const auto& b : blocks) {
    if (!b.alive || b.type != BlockType::PowerToggle) continue;
    s.toggles[static_cast<std::size_t>(s.toggleCount)] = b.id;
    s.toggleOn[static_cast<std::size_t>(s.toggleCount++)] = b.params[gen::param::PowerToggle::logic] != 0.0 ? 1 : 0;
  }
  s.beamCount = 0;
  for (const auto& b : engine_->beams()) {
    const auto k = static_cast<std::size_t>(s.beamCount++ * 4);
    s.beams[k] = static_cast<float>(b.x0); s.beams[k + 1] = static_cast<float>(b.y0); s.beams[k + 2] = static_cast<float>(b.x1); s.beams[k + 3] = static_cast<float>(b.y1);
  }
  {
    std::array<Engine::Playhead, 64> ph{};
    s.playheadCount = engine_->playheads(ph.data(), 64);
    for (int i = 0; i < s.playheadCount; ++i) {
      s.playheads[static_cast<std::size_t>(i * 2)] = static_cast<float>(ph[static_cast<std::size_t>(i)].block);
      s.playheads[static_cast<std::size_t>(i * 2 + 1)] = ph[static_cast<std::size_t>(i)].seconds;
    }
  }
  s.pairCount = engine_->connections(s.pairs.data(), static_cast<int>(s.pairs.size() / 2));  // oldest first (R4a)
  snapshots_.publish();
}

std::string BlokDustProcessor::patchJson() { flushDust(); return patch_.dump(); }

// ---- samples (CHG-0004 3.6/3.7) ----
namespace {
bool isSampler(const std::string& type) {
  return type == "source.sample" || type == "source.granular" || type == "fx.convolver" || type == "source.recorder" || type == "source.sample-gen";
}
bool isDeadDefault(const nlohmann::json& track) {
  if (!track.is_string()) return true;
  const auto t = track.get<std::string>();
  return t.empty() || t.rfind("https://files.blokdust.io/", 0) == 0 || t.rfind("http://files.blokdust.io/", 0) == 0;
}
/// v2's default sounds (web/src/patch/samples.ts DEFAULT_SOUNDS): CC0 Freesound previews for new Sample/Granular blocks.
nlohmann::json defaultSound(const std::string& type) {
  if (type == "source.sample") return {{"provider", "freesound"}, {"id", 223835}, {"name", "[Synth] ambient key"}, {"username", "waveplaySFX"},
    {"license", "CC0"}, {"licenseUrl", "http://creativecommons.org/publicdomain/zero/1.0/"}, {"duration", 7.68},
    {"preview", "https://cdn.freesound.org/previews/223/223835_1676145-hq.mp3"}, {"url", "https://freesound.org/people/waveplaySFX/sounds/223835/"}};
  if (type == "source.granular") return {{"provider", "freesound"}, {"id", 191167}, {"name", "Piano drone"}, {"username", "laserlife"},
    {"license", "CC0"}, {"licenseUrl", "http://creativecommons.org/publicdomain/zero/1.0/"}, {"duration", 14.8608},
    {"preview", "https://cdn.freesound.org/previews/191/191167_2372469-hq.mp3"}, {"url", "https://freesound.org/people/laserlife/sounds/191167/"}};
  return nullptr;
}
std::int64_t rangeFor(const std::string& type, double maxSeconds) {
  if (maxSeconds <= 0 && type != "fx.convolver") return 0;
  return static_cast<std::int64_t>(std::ceil(((maxSeconds > 0 ? maxSeconds : 2.5) + 0.5) * 40000));  // ≤ 320 kbps, as the web
}
}  // namespace

void BlokDustProcessor::releasePageKeys() {
  for (std::size_t k = 0; k < pageKeys_.size(); ++k)
    if (pageKeys_[k] && engine_) engine_->push(Command::noteOff(BlockType::InputComputerKeyboard, static_cast<std::uint8_t>(k)));
  pageKeys_.reset();
}

void BlokDustProcessor::applyUiCommands(const nlohmann::json& commands) {
  if (!commands.is_array()) return;
  auto& blocks = patch_["blocks"];
  auto find = [&](BlockId id) -> nlohmann::json* {
    const auto it = idToKey_.find(id);
    if (it == idToKey_.end()) return nullptr;
    for (auto& b : blocks) if (b["id"] == it->second) return &b;
    return nullptr;
  };
  for (const auto& j : commands) {
    Command c;
    c.type = static_cast<Command::Type>(j.value("type", 0));
    c.id = j.value("id", 0u);
    c.blockType = static_cast<BlockType>(j.value("blockType", 0));
    c.x = j.value("x", 0.0); c.y = j.value("y", 0.0);
    c.param = static_cast<std::uint8_t>(j.value("param", 0)); c.value = j.value("value", 0.0);
    if (engine_) engine_->push(c);
    // keep the patch model (host state) in step with the engine
    switch (c.type) {
      case Command::Type::AddBlock: {
        const std::string key = j.value("key", "b" + std::to_string(c.id));  // the page's patch id for it
        idToKey_[c.id] = key;
        blocks.push_back({{"id", key}, {"type", std::string(gen::info(c.blockType).id)}, {"x", c.x}, {"y", c.y}});
        // A new Sample / Granular starts with v2's default sound, as on the web (DATA-0005 notes).
        if (auto d = defaultSound(std::string(gen::info(c.blockType).id)); !d.is_null())
          loadFreesound(c.id, d, {{"trackName", juce::String(d["name"].get<std::string>()).toUpperCase().substring(0, 30).toStdString()}, {"user", d["username"]}, {"permalink", d["url"]}}, 0);
        break;
      }
      case Command::Type::MoveBlock: if (auto* b = find(c.id)) { (*b)["x"] = c.x; (*b)["y"] = c.y; } break;
      case Command::Type::RemoveBlock: {
        const auto it = idToKey_.find(c.id);
        if (it != idToKey_.end()) {
          for (auto b = blocks.begin(); b != blocks.end(); ++b) if ((*b)["id"] == it->second) { blocks.erase(b); break; }
          idToKey_.erase(it);
        }
        break;
      }
      case Command::Type::NoteOn:
      case Command::Type::NoteOff:
        if (c.blockType == BlockType::InputComputerKeyboard && c.param < 128) pageKeys_.set(c.param, c.type == Command::Type::NoteOn);
        break;
      case Command::Type::NoteExpression:
      case Command::Type::Press: break;  // performance, not patch state
      case Command::Type::Relink: break;  // the order arrives whole (setConnectionOrder)
      case Command::Type::SetParam:
        if (auto* b = find(c.id)) {
          BlockType t{};
          if (gen::findBlockType((*b)["type"].get<std::string>(), t) && c.param < gen::info(t).paramCount)
            (*b)["params"][std::string(gen::info(t).params[c.param].key)] = c.value;
        }
        break;
    }
  }
}

void BlokDustProcessor::getStateInformation(juce::MemoryBlock& dest) {
  // The patch, plus what only the plugin has: the Dust 1–8 values (hosts restore them from this, CHG-0004 3.10).
  // Block params follow Dust (flushDust touches the patch, so only on the message thread, where hosts usually ask).
  if (juce::MessageManager::existsAndIsCurrentThread()) flushDust();
  auto state = patch_;
  auto dust = nlohmann::json::array();
  for (auto* p : dustParams_) dust.push_back(p->get());
  state["plugin"] = {{"dust", dust}};
  const auto text = state.dump();
  dest.replaceAll(text.data(), text.size());
}

void BlokDustProcessor::setStateInformation(const void* data, int sizeInBytes) {
  try {
    const auto* p = static_cast<const char*>(data);
    patch_ = nlohmann::json::parse(p, p + sizeInBytes);
  } catch (const std::exception& e) { DBG("BlokDust: bad state: " << e.what()); return; }
  if (patch_.contains("plugin")) {
    const auto dust = patch_["plugin"].value("dust", nlohmann::json::array());
    for (std::size_t i = 0; i < dustParams_.size() && i < dust.size(); ++i)
      if (dust[i].is_number()) dustParams_[i]->setValueNotifyingHost(dust[i].get<float>());
    patch_.erase("plugin");  // the patch itself stays a plain v2 patch (what the editor and web see)
  }
  samples_.clear(); missing_.clear();
  rebuildEngine();
  restoreSamples();
  if (auto* ed = dynamic_cast<BlokDustEditor*>(getActiveEditor())) ed->reloadPatch();
}


void BlokDustProcessor::applyPatch(const nlohmann::json& part, bool open) {
  patch_ = patchfiles::merge(patch_, part, open);
  if (open) { samples_.clear(); missing_.clear(); }
  rebuildEngine();
  restoreSamples();
  if (auto* ed = dynamic_cast<BlokDustEditor*>(getActiveEditor())) ed->reloadPatch();
}

nlohmann::json* BlokDustProcessor::blockJson(const std::string& key) {
  for (auto& b : patch_["blocks"]) if (b.value("id", std::string{}) == key) return &b;
  return nullptr;
}

void BlokDustProcessor::pickFile(BlockId id) {
  const auto key = keyOf(id);
  if (key.empty()) return;
  chooser_ = std::make_unique<juce::FileChooser>("Choose an audio file for BlokDust", juce::File{}, "*.wav;*.aif;*.aiff;*.flac;*.ogg;*.mp3;*.m4a;*.caf", true, false,
                                                 pickerParent(getActiveEditor()));
  chooser_->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this, id](const juce::FileChooser& fc) {
#if JUCE_IOS
    // iPad (CHG-0025 task 6): the picked file is copied into the shared Samples folder and the copy is what the patch
    // references, so the app and the extension in any host can read it later.
    if (const auto url = fc.getURLResult(); !url.isEmpty())
      loader_.copyIn(url, patchfiles::root().getChildFile("Samples"), [this, id](juce::File f, std::string err) {
        systemLog(f.existsAsFile() ? juce::String("sample: copied in, ") + juce::String(f.getSize()) + " bytes" : juce::String("sample: copy failed: ") + err);
        if (f.existsAsFile()) loadFile(id, f);
      });
#else
    if (const auto f = fc.getResult(); f.existsAsFile()) loadFile(id, f);
#endif
  });
}

void BlokDustProcessor::loadFile(BlockId id, const juce::File& file) {
  const auto key = keyOf(id);
  if (key.empty()) return;
  const bool fresh = missing_.count(key) == 0;  // relinking a missing file keeps its region
  loading_.insert(key);
  const int gen = ++loadGen_[key];
  if (onSampleInfo) onSampleInfo(sampleInfo(key));
  loader_.loadFile(file, [this, key, fresh, gen](std::shared_ptr<LoadedSample> s, const std::string& err) {
    if (loadGen_[key] != gen) return;  // superseded by a newer choice
    loading_.erase(key);
    juce::ignoreUnused(err);
    if (!s) { DBG("BlokDust: " << err); if (onSampleInfo) onSampleInfo(sampleInfo(key)); return; }
    useSample(key, s, fresh, {{"trackName", s->ref.value("name", std::string{})}, {"user", "Local file"}, {"permalink", ""}});
  });
}

void BlokDustProcessor::loadFreesound(BlockId id, const nlohmann::json& ref, const nlohmann::json& display, double maxSeconds) {
  const auto key = keyOf(id);
  auto* b = blockJson(key);
  if (!b || !ref.contains("preview")) return;
  loading_.insert(key);
  const int gen = ++loadGen_[key];
  if (onSampleInfo) onSampleInfo(sampleInfo(key));
  loader_.loadUrl(ref["preview"].get<std::string>(), ref, rangeFor(b->value("type", std::string{}), maxSeconds),
                  [this, key, display, gen](std::shared_ptr<LoadedSample> s, const std::string& err) {
    if (loadGen_[key] != gen) return;  // superseded by a newer choice
    loading_.erase(key);
    juce::ignoreUnused(err);
    if (!s) { DBG("BlokDust: Freesound: " << err); markMissing(key); return; }
    useSample(key, s, true, display);
  });
}

void BlokDustProcessor::useSample(const std::string& key, std::shared_ptr<LoadedSample> s, bool fresh, const nlohmann::json& display) {
  auto* b = blockJson(key);
  if (!b) return;
  samples_[key] = s;
  missing_.erase(key);
  auto& params = (*b)["params"];
  if (!params.is_object()) params = nlohmann::json::object();
  params["track"] = s->track;
  for (const char* k : {"trackName", "user", "permalink"}) if (display.contains(k)) params[k] = display[k];
  if (!patch_.contains("refs") || !patch_["refs"].is_object()) patch_["refs"] = nlohmann::json::object();
  patch_["refs"][s->track] = s->ref;
  // v1 Sample.SetBuffers: a new sample resets the region (as the web, SPEC-SHARING-BACKEND R17).
  // Recorder: loop from half way too (v1 Recorder.UpdateWaveform); SampleGen loops all of it (v1 SampleGen).
  const auto type = b->value("type", std::string{});
  const bool region = type == "source.sample" || type == "source.recorder" || type == "source.sample-gen";
  if (region && (fresh || !params.contains("endPosition") || !params["endPosition"].is_number() || params["endPosition"].get<double>() <= 0)) {
    params["startPosition"] = 0.0; params["endPosition"] = s->duration; params["loopStart"] = type == "source.sample-gen" ? 0.0 : s->duration * 0.5; params["loopEnd"] = s->duration;
    if (fresh) params["reverse"] = false;
  }
  // v1 Granular: a new sound puts the grains' spawn point half way through it (a saved one keeps its own).
  if (b->value("type", std::string{}) == "source.granular" && (fresh || !params.contains("region") || !params["region"].is_number()))
    params["region"] = s->duration * 0.5;
  // Drop refs no block uses any more.
  std::set<std::string> used;
  for (const auto& blk : patch_["blocks"]) if (blk.contains("params") && blk["params"].contains("track") && blk["params"]["track"].is_string()) used.insert(blk["params"]["track"].get<std::string>());
  for (auto it = patch_["refs"].begin(); it != patch_["refs"].end();) { if (used.count(it.key())) ++it; else it = patch_["refs"].erase(it); }
  if (const auto id = idOf(key); id != kInvalidBlock && engine_) {
    BlockType t{};
    if (gen::findBlockType(b->value("type", std::string{}), t)) {
      const auto& inf = gen::info(t);
      for (std::uint8_t p = 0; p < inf.paramCount; ++p)
        if (const auto v = params.find(std::string(inf.params[p].key)); v != params.end() && (v->is_number() || v->is_boolean()))
          engine_->push(Command::setParam(id, p, v->is_boolean() ? (v->get<bool>() ? 1.0 : 0.0) : v->get<double>()));
    }
  }
  attachSamples();
  if (onSampleInfo) onSampleInfo(sampleInfo(key));
}

void BlokDustProcessor::attachSamples() {
  if (!engine_) return;
  suspendProcessing(true);  // the audio thread is not inside processBlock while buffers change hands
  for (const auto& [key, s] : samples_) {
    const auto id = idOf(key);
    if (id == kInvalidBlock) continue;
    engine_->attachSample(id, SampleBuffer{s->audio.getReadPointer(0), s->audio.getNumChannels() > 1 ? s->audio.getReadPointer(1) : nullptr,
                                           static_cast<std::uint32_t>(s->audio.getNumSamples()), s->sampleRate});
  }
  suspendProcessing(false);
}

void BlokDustProcessor::markMissing(const std::string& key) {
  missing_.insert(key);
  if (onSampleInfo) onSampleInfo(sampleInfo(key));
}

/// A project reopened in the DAW: every sampler's reference loads again (files relinked by name + fingerprint).
void BlokDustProcessor::restoreSamples() {
  for (const auto& b : patch_["blocks"]) {
    const auto type = b.value("type", std::string{}), key = b.value("id", std::string{});
    if (!isSampler(type) || samples_.count(key)) continue;  // already loaded (an Insert keeps the scene's samples)
    const auto track = b.contains("params") ? b["params"].value("track", nlohmann::json()) : nlohmann::json();
    const auto id = idOf(key);
    if (isDeadDefault(track)) {
      if (auto d = defaultSound(type); !d.is_null())
        loadFreesound(id, d, {{"trackName", juce::String(d["name"].get<std::string>()).toUpperCase().substring(0, 30).toStdString()}, {"user", d["username"]}, {"permalink", d["url"]}}, 0);
      continue;
    }
    const auto t = track.get<std::string>();
    const auto ref = patch_.contains("refs") && patch_["refs"].contains(t) ? patch_["refs"][t] : nlohmann::json();
    if (ref.value("provider", std::string{}) == "freesound") {
      nlohmann::json display = {{"trackName", b["params"].value("trackName", std::string{})}, {"user", b["params"].value("user", std::string{})}, {"permalink", b["params"].value("permalink", std::string{})}};
      loading_.insert(key);
      const int gen = ++loadGen_[key];
      loader_.loadUrl(ref.value("preview", std::string{}), ref, rangeFor(type, 0), [this, key, display, gen](std::shared_ptr<LoadedSample> s, const std::string&) {
        if (loadGen_[key] != gen) return;
        loading_.erase(key);
        if (s) useSample(key, s, false, display); else markMissing(key);
      });
    } else if (ref.value("provider", std::string{}) == "file") {
#if JUCE_IOS
      const auto f = SampleLoader::relink(ref, patchfiles::root().getChildFile("Samples"));
      if (f.existsAsFile() && f.getFullPathName().toStdString() != ref.value("path", std::string{}) && f.isAChildOf(patchfiles::root().getChildFile("Samples")))
        systemLog("sample: relinked from Samples");
#else
      const auto f = SampleLoader::relink(ref);
#endif
      if (!f.existsAsFile()) { missing_.insert(key); continue; }
      loading_.insert(key);
      nlohmann::json display = {{"trackName", b["params"].value("trackName", std::string{})}, {"user", "Local file"}, {"permalink", ""}};
      const int gen = ++loadGen_[key];
      loader_.loadFile(f, [this, key, display, gen](std::shared_ptr<LoadedSample> s, const std::string&) {
        if (loadGen_[key] != gen) return;
        loading_.erase(key);
        if (s) useSample(key, s, false, display); else markMissing(key);
      });
    } else missing_.insert(key);
  }
}

nlohmann::json BlokDustProcessor::sampleInfo(const std::string& key) const {
  nlohmann::json j = {{"id", idOf(key)}, {"key", key}, {"missing", missing_.count(key) > 0}, {"loading", loading_.count(key) > 0}};
  if (const auto it = samples_.find(key); it != samples_.end()) {
    j["track"] = it->second->track; j["duration"] = it->second->duration; j["sampleRate"] = it->second->sampleRate;
    j["preview"] = it->second->preview;
  }
  for (const auto& b : patch_["blocks"]) if (b.value("id", std::string{}) == key && b.contains("params")) {
    for (const char* k : {"track", "trackName", "user", "permalink", "startPosition", "endPosition", "loopStart", "loopEnd", "reverse", "region"})
      if (b["params"].contains(k)) j["params"][k] = b["params"][k];
  }
  if (patch_.contains("refs") && j.contains("track") && patch_["refs"].contains(j["track"].get<std::string>())) j["ref"] = patch_["refs"][j["track"].get<std::string>()];
  return j;
}

nlohmann::json BlokDustProcessor::sampleInfos() const {
  auto all = nlohmann::json::array();
  for (const auto& b : patch_["blocks"]) if (isSampler(b.value("type", std::string{}))) all.push_back(sampleInfo(b.value("id", std::string{})));
  return all;
}

juce::AudioProcessorEditor* BlokDustProcessor::createEditor() {
  systemLog(juce::String(kFx ? "fx" : "instrument") + ": createEditor");
  return new BlokDustEditor(*this);
}

}  // namespace blokdust::plugin

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new blokdust::plugin::BlokDustProcessor(); }

// ---- Recorder and SampleGen in the plugin (owner, Logic): their audio becomes a file the DAW project references ----
namespace blokdust::plugin {
namespace {
juce::File blokdustFolder(const char* sub) {
  auto dir = patchfiles::root().getChildFile(sub);  // ~/Music/BlokDust, or the App Group on iPad
  dir.createDirectory();
  return dir;
}
juce::File writeWav(const juce::File& dir, const juce::String& stem, const std::vector<std::vector<float>>& ch, double sr) {
  if (ch.empty() || ch[0].empty()) return {};
  const auto file = dir.getNonexistentChildFile(stem + " " + juce::Time::getCurrentTime().formatted("%Y-%m-%d %H-%M-%S"), ".wav", false);
  juce::AudioBuffer<float> buf(static_cast<int>(ch.size()), static_cast<int>(ch[0].size()));
  for (std::size_t c = 0; c < ch.size(); ++c) buf.copyFrom(static_cast<int>(c), 0, ch[c].data(), static_cast<int>(ch[c].size()));
  juce::WavAudioFormat wav;
  std::unique_ptr<juce::OutputStream> out(new juce::FileOutputStream(file));
  std::unique_ptr<juce::AudioFormatWriter> w(wav.createWriterFor(out, juce::AudioFormatWriterOptions{}.withSampleRate(sr).withNumChannels(buf.getNumChannels()).withBitsPerSample(24)));
  if (!w || !w->writeFromAudioSampleBuffer(buf, 0, buf.getNumSamples())) return {};
  return file;
}
}  // namespace

void BlokDustProcessor::captureRecording(const float* l, const float* r, int n) noexcept {
  int s1, n1, s2, n2;
  recFifo_.prepareToWrite(n, s1, n1, s2, n2);
  if (n1 > 0) { recFifoBuf_.copyFrom(0, s1, l, n1); recFifoBuf_.copyFrom(1, s1, r, n1); }
  if (n2 > 0) { recFifoBuf_.copyFrom(0, s2, l + n1, n2); recFifoBuf_.copyFrom(1, s2, r + n1, n2); }
  recFifo_.finishedWrite(n1 + n2);  // a full FIFO drops the rest (the drain is late by > 4 s)
}

void BlokDustProcessor::drainRecording() {
  int s1, n1, s2, n2;
  recFifo_.prepareToRead(recFifo_.getNumReady(), s1, n1, s2, n2);
  for (int c = 0; c < 2; ++c) {
    auto& v = recorded_[static_cast<std::size_t>(c)];
    const float* d = recFifoBuf_.getReadPointer(c);
    v.insert(v.end(), d + s1, d + s1 + n1);
    v.insert(v.end(), d + s2, d + s2 + n2);
  }
  recFifo_.finishedRead(n1 + n2);
}

void BlokDustProcessor::setRecording(BlockId id, bool on) {
  if (on) {
    if (recording_.load() || sampleRate_ <= 0.0) return;
    recorded_[0].clear(); recorded_[1].clear();
    recFifo_.reset();
    recordingBlock_ = id;
    recording_.store(true);
    recDrain_.startTimerHz(20);
    return;
  }
  if (!recording_.exchange(false)) return;
  recDrain_.stopTimer();
  drainRecording();
  const auto file = writeWav(blokdustFolder("Recordings"), "BlokDust Recording", {recorded_[0], recorded_[1]}, sampleRate_);
  recorded_[0].clear(); recorded_[1].clear();
  if (file.existsAsFile()) loadFile(recordingBlock_, file);
}

void BlokDustProcessor::useGenerated(BlockId id, const std::vector<float>& mono, double sampleRate) {
  const auto file = writeWav(blokdustFolder("SampleGen"), "BlokDust SampleGen", {mono}, sampleRate);
  if (file.existsAsFile()) loadFile(id, file);
}

void BlokDustProcessor::revealSample(BlockId id) {
  const auto key = keyOf(id);
  const auto it = samples_.find(key);
  if (it == samples_.end()) return;
  const juce::File f(juce::String(it->second->ref.value("path", std::string{})));
  if (!f.existsAsFile()) return;
#if JUCE_IOS
  chooser_ = std::make_unique<juce::FileChooser>("Save the recording", f, "*.wav", true, false, pickerParent(getActiveEditor()));
  chooser_->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles, [](const juce::FileChooser&) {});
#else
  f.revealToUser();
#endif
}
}  // namespace blokdust::plugin
