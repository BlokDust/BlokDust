#pragma once
// Plugin editor: the same web stage app (ARCHITECTURE-0003) in JUCE 8's WebView, bridged with JUCE events:
//   JS → native: bd_hello (send me the patch), bd_commands ({commands:[...]}), bd_ready ({blocks})
//   native → JS: bd_patch ({patch: "<json>"}), bd_snapshot ({particles, connections, powered}),
//                bd_sampleInfo ({id, track, duration, preview, params, ref, missing, loading})
//   JS → native (samples, CHG-0004): bd_pickFile ({id}), bd_loadUrl ({id, ref, display, maxSeconds}), bd_samplesHello
#include <juce_gui_extra/juce_gui_extra.h>

#include "PluginProcessor.h"
#include "WebViewDrops.h"

namespace blokdust::plugin {

class BlokDustEditor : public juce::AudioProcessorEditor, public juce::FileDragAndDropTarget, private juce::Timer {
 public:
  explicit BlokDustEditor(BlokDustProcessor&);
  ~BlokDustEditor() override { stopTimer(); proc_.releasePageKeys(); proc_.onSampleInfo = nullptr; proc_.onCcLearned = nullptr; }
  void resized() override { web_.setBounds(getLocalBounds()); }
  void reloadPatch();
  void sendSampleInfo(const nlohmann::json& s);
  /// A patch file's text to the page (bd_patchFile), for Open / Insert. `req` < 0: not a reply (a dialog or a drop).
  void sendPatchFile(const juce::File& f, const juce::String& mode, int req);
  void sendPatchText(const juce::String& text, const juce::String& name, const juce::String& file, const juce::String& mode, int req);
  // Audio files dropped from Finder/Explorer or the DAW (CHG-0004 3.7): the page says which block is under the drop
  // (or makes a new Sample there), then the processor loads the file by its path.
  bool isInterestedInFileDrag(const juce::StringArray& files) override;
  void filesDropped(const juce::StringArray& files, int x, int y) override;
  /// Number of blocks the web UI reported after building its stage (bridge round-trip; host tests read this).
  int uiReadyBlocks() const noexcept { return uiReadyBlocks_; }

 private:
  void timerCallback() override;
  void tick();  // snapshot, params, keys: on the display's refresh at up to 60 a second, like the web app's worklet
  static std::optional<juce::WebBrowserComponent::Resource> resource(const juce::String& url);

  BlokDustProcessor& proc_;
  int uiReadyBlocks_ = -1;
  bool dropsRouted_ = false;
  bool hadKeys_ = false;  // the editor's window had the keyboard at the last tick
  int sent_ = 0;           // snapshots sent since the page's last stats (bd_stats)
  double sentSince_ = 0;
  double sentPerSecond();
  int dropToken_ = 0;
  juce::String pendingDrop_;
  std::unique_ptr<juce::FileChooser> patchChooser_;
  juce::WebBrowserComponent web_;
  /// Runs the daily usage ping off the message thread (SHARING-0010 R8); waits for it, briefly, when the editor closes.
  juce::ThreadPool telemetryPool_{1};
  KeyUpsToHost keyUps_{*this};  // Logic's Musical Typing gets its note-offs while the page has the keys
  juce::ScopedMessageBox linkNote_;  // iPad extension: "Link copied" (bd_openUrl)
  int hostState_ = -1;               // power mode · 2 + host playing, last sent to the page (bd_hostState)
  double lastTick_ = 0;              // ms (Time::getMillisecondCounterHiRes) of the last tick
  // Each display refresh, at most 60 ticks a second (every other one at 120 Hz); the 30 Hz timer stands in when the
  // display sends none (owner, iPad: 30 snapshots a second looked jumpy, 2026-11-16).
  juce::VBlankAttachment vblank_{this, [this] {
    if (juce::Time::getMillisecondCounterHiRes() - lastTick_ >= 1000.0 / 60 - 4) tick();
  }};
};

}  // namespace blokdust::plugin
