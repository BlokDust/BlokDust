#pragma once
#include <bitset>
// BlokDust plugin processor (PLUGIN-0001): hosts the portable engine; state = patch v2 JSON (SPEC-PATCH-FORMAT-V2).
#include <juce_audio_processors/juce_audio_processors.h>
#include <nlohmann/json.hpp>

#include <atomic>
#include <functional>
#include <map>
#include <set>
#include <memory>

#include "Samples.h"
#include "SnapshotBuffer.h"
#include "WebViewDrops.h"
#include "blokdust/engine.hpp"
#include "blokdust/mpe.hpp"

namespace blokdust::plugin {

/// A Dust slot as the host sees it (PLUGIN-0003): "Dust 3", or "Dust 3 · Filter · Gain" once assigned, where hosts
/// show parameter names (CHG-0004 3.9).
class DustParameter : public juce::AudioParameterFloat {
 public:
  DustParameter(int slot) : juce::AudioParameterFloat(juce::ParameterID{"dust" + juce::String(slot), 1}, "Dust " + juce::String(slot),
                                                       juce::NormalisableRange<float>(0.0f, 1.0f), 0.0f), slot_(slot) {}
  juce::String getName(int maxLength) const override {
    const juce::ScopedLock l(lock_);
    return (target_.isEmpty() ? "Dust " + juce::String(slot_) : "Dust " + juce::String(slot_) + " " + juce::String(juce::CharPointer_UTF8("\xc2\xb7")) + " " + target_).substring(0, maxLength);
  }
  void setTarget(const juce::String& t) { const juce::ScopedLock l(lock_); target_ = t; }

 private:
  int slot_;
  juce::String target_;
  juce::CriticalSection lock_;
};

class BlokDustProcessor : public juce::AudioProcessor, private juce::AsyncUpdater {
 public:
  BlokDustProcessor();
  ~BlokDustProcessor() override = default;

  void prepareToPlay(double sampleRate, int samplesPerBlock) override;
  void releaseResources() override {}
  bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
  void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
  using AudioProcessor::processBlock;
  /// Bypassed by the host (Logic's power button): the world keeps running (the stage still connects blocks, and
  /// coming back sounds as if it had never stopped); the output is silence (instrument) or the dry input (FX).
  void processBlockBypassed(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
  using AudioProcessor::processBlockBypassed;
  /// Message thread (the editor's timer): when the host has stopped calling processBlock (a disabled plugin), run the
  /// world for the time that passed, silently, so the stage still moves and connects. No-op while audio runs.
  void idleTick() noexcept;
  std::uint64_t snapshotSeq() const noexcept { return snapshotSeq_; }

  juce::AudioProcessorEditor* createEditor() override;
  bool hasEditor() const override { return true; }
  /// BlokDust FX (an effect with Audio In) rather than the instrument (PLUGIN-0002).
  static constexpr bool isFx() noexcept {
#if BLOKDUST_FX
    return true;
#else
    return false;
#endif
  }
  const juce::String getName() const override { return JucePlugin_Name; }
  bool acceptsMidi() const override { return true; }
  bool producesMidi() const override { return false; }
  double getTailLengthSeconds() const override { return 0.0; }
  int getNumPrograms() override { return 1; }
  int getCurrentProgram() override { return 0; }
  void setCurrentProgram(int) override {}
  const juce::String getProgramName(int) override { return {}; }
  void changeProgramName(int, const juce::String&) override {}
  void getStateInformation(juce::MemoryBlock& dest) override;
  void setStateInformation(const void* data, int sizeInBytes) override;

  // ---- message thread (editor bridge) ----
  /// Current patch as JSON text (what the editor loads, and what the host saves).
  /// The patch as the host saves it, Dust moves included (message thread).
  std::string patchJson();
  /// A block param that Dust (host automation, MIDI CC) moved: the editor shows it (owner, Ableton, 2026-11-12).
  struct ParamUpdate { BlockId id; std::string param; double value; };
  /// Message thread: write what Dust moved since last time into the patch, and queue it for the editor.
  void flushDust();
  /// Message thread: the Dust moves the editor has not shown yet (flushDust first).
  std::vector<ParamUpdate> takeParamUpdates() { return std::exchange(paramUpdates_, {}); }
  /// Message thread: Toggles the engine switched (particle and laser hits) since the last snapshot go into the patch,
  /// so the host's project, a saved file and a share link keep them as they are, as v1's Toggle did; and they are
  /// queued for the editor like Dust moves (CHG-0013).
  void syncToggles(const Snapshot& s);
  /// Engine id → patch block id (message thread).
  const std::map<BlockId, std::string>& blockIds() const noexcept { return idToKey_; }
  /// Apply UI commands ([{type,id,blockType,x,y,param,value}]) to the engine and the patch model.
  void applyUiCommands(const nlohmann::json& commands);
  /// Message thread. End the Computer Keyboard notes the page is holding (its window lost the keys, or it closed).
  void releasePageKeys();
  SnapshotBuffer& snapshots() noexcept { return snapshots_; }
  /// Dust assignment from the editor (right-click a slider, PLUGIN-0003): slot 1..8 maps `param` of block `id`;
  /// slot 0 clears that block/param. Updates the patch's "automation" list (saved with the host project).
  void setAutomation(int slot, BlockId id, const std::string& param);
  /// R4a: the order the connected pairs connected in ([[patch id, patch id]...], oldest first), from the editor, which
  /// reads it from the engine. Saved in the patch as "connectionOrder" so a reopened project keeps its effect order.
  void setConnectionOrder(const nlohmann::json& order) { if (order.is_array()) patch_["connectionOrder"] = order; }
  /// The editor's view (zoom, offset; owner 2026-11-12): saved with the patch, so a reopened project shows it.
  void setView(const nlohmann::json& view) { if (view.is_object() && view.contains("zoom")) patch_["view"] = view; }
  /// MIDI learn (CHG-0004 3.9): the next CC received drives Dust `slot` (saved in its automation entry as "cc").
  void learnCc(int slot) noexcept { learnSlot_.store(slot); }
  std::function<void(int slot, int cc)> onCcLearned;  // set by the editor (message thread)

  // ---- samples (CHG-0004 3.6/3.7): loaded natively, saved as references in the patch (DATA-0005) ----
  /// "Your file" in the sample panel: a native file chooser (a real path is what the DAW project keeps).
  void pickFile(BlockId id);
  /// A file by path (drag and drop onto the editor, or tests).
  void loadFile(BlockId id, const juce::File& file);
  /// Patches panel (CHG-0005): Open replaces the scene with `part` ({blocks, refs, tempo?}); Insert adds its blocks.
  /// The engine is rebuilt from the merged patch; samples already loaded stay, new ones load; the editor reloads.
  void applyPatch(const nlohmann::json& part, bool open);
  /// A Freesound sound picked in the panel: `ref` as the web keeps it; `display` = {trackName, user, permalink}.
  void loadFreesound(BlockId id, const nlohmann::json& ref, const nlohmann::json& display, double maxSeconds);
  /// What the UI shows for every sampler: [{id, track, duration, preview, missing, loading}].
  nlohmann::json sampleInfos() const;
  std::function<void(const nlohmann::json&)> onSampleInfo;  // set by the editor (message thread)
  /// Recorder (owner, Logic): record the plugin's output; stopping writes it to ~/Music/BlokDust/Recordings and loads
  /// it into block `id` as its file (the project references it like any user file, DATA-0005).
  void setRecording(BlockId id, bool on);
  bool isRecording() const noexcept { return recording_.load(); }
  /// SampleGen: the editor generates (v1's generator) and hands over the audio; saved to ~/Music/BlokDust/SampleGen
  /// and loaded as the block's file, so a reopened project plays it without the editor.
  void useGenerated(BlockId id, const std::vector<float>& mono, double sampleRate);
  /// Recorder's download button in a DAW: show the block's file in Finder / Explorer.
  /// The Recorder's download: the take is already a file, so show it (Finder / Explorer). iPad: export a copy through
  /// the document picker (CHG-0025 task 6), as there is no Finder.
  void revealSample(BlockId id);

  static constexpr int kDustSlots = 8;  // PLUGIN-0003

 private:
  static BusesProperties buses();
  void rebuildEngine();
  void useSample(const std::string& key, std::shared_ptr<LoadedSample> s, bool fresh, const nlohmann::json& display);
  void attachSamples();
  void restoreSamples();
  void markMissing(const std::string& key);
  nlohmann::json sampleInfo(const std::string& key) const;
  std::string keyOf(BlockId id) const { const auto it = idToKey_.find(id); return it == idToKey_.end() ? std::string{} : it->second; }
  BlockId idOf(const std::string& key) const { for (const auto& [id, k] : idToKey_) if (k == key) return id; return kInvalidBlock; }
  nlohmann::json* blockJson(const std::string& key);
  void rebuildDust();
  void publishSnapshot() noexcept;
  void applyAutomation() noexcept;
  void render(juce::AudioBuffer<float>& buffer, int from, int to) noexcept;

  struct DustSlot { bool active = false; BlockId block = kInvalidBlock; BlockType type{}; std::uint8_t param = 0; float last = -1.0f; int cc = -1; };
  void handleAsyncUpdate() override;                // commits a learned CC into the patch (message thread)
  void applyDust(std::size_t slot, float v) noexcept;
  std::atomic<int> learnSlot_{0}, learnedSlot_{0}, learnedCc_{-1};
  std::array<DustSlot, kDustSlots> dust_{};
  // Dust → editor/patch (owner, 2026-11-12): the audio thread stores each slot's latest mapped value and marks it;
  // flushDust (message thread) takes them. Lock-free.
  std::array<std::atomic<double>, kDustSlots> dustValue_{};
  std::array<std::atomic<bool>, kDustSlots> dustMoved_{};
  std::vector<ParamUpdate> paramUpdates_;
  std::map<BlockId, bool> togglesSeen_;  // each Toggle's state in the last snapshot (syncToggles)
  std::array<DustParameter*, kDustSlots> dustParams_{};

  nlohmann::json patch_;
  std::map<BlockId, std::string> idToKey_;  // engine id → patch block id
  std::unique_ptr<Engine> engine_;          // swapped only while processing is suspended
  MidiRouter midiRouter_;                   // host MIDI → MIDI Input blocks (MPE, PLUGIN-0004)
  double lastBpm_ = 0.0;                    // host tempo last sent to the engine
  bool hostPlaying_ = false;                // the host transport was playing at the last block (audio thread)
  SampleLoader loader_;
  std::map<std::string, std::shared_ptr<LoadedSample>> samples_;  // by patch block id; kept alive while attached
  std::set<std::string> missing_, loading_;
  std::map<std::string, int> loadGen_;      // latest load request per block: an older one finishing late is ignored
  std::unique_ptr<juce::FileChooser> chooser_;
  double sampleRate_ = 0.0;
  int samplesSinceSnapshot_ = 0, samplesPerSnapshot_ = 735;  // a UI snapshot each 1/60 s of audio
  std::uint64_t snapshotSeq_ = 0;
  std::bitset<128> pageKeys_;  // Computer Keyboard notes held from the editor page (message thread)
  std::atomic<double> lastProcessMs_{0.0};  // when processBlock last ran (ms counter); 0 = never
  double lastIdleMs_ = 0.0;
  juce::AudioBuffer<float> idleBuf_, dryBuf_;  // preallocated in prepareToPlay
  // Recorder: the audio thread writes the output into a FIFO; a message-thread timer drains it while recording.
  void captureRecording(const float* l, const float* r, int n) noexcept;
  void drainRecording();
  struct Drain : juce::Timer { std::function<void()> f; void timerCallback() override { f(); } };
  std::atomic<bool> recording_{false};
  BlockId recordingBlock_ = kInvalidBlock;
  juce::AbstractFifo recFifo_{1};
  juce::AudioBuffer<float> recFifoBuf_;
  std::array<std::vector<float>, 2> recorded_;
  Drain recDrain_;
  SnapshotBuffer snapshots_;
  std::vector<float> scratch_;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(BlokDustProcessor)
};

}  // namespace blokdust::plugin
