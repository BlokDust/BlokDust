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
  // Audio files dropped from Finder/Explorer or the DAW (CHG-0004 3.7): the page says which block is under the drop
  // (or makes a new Sample there), then the processor loads the file by its path.
  bool isInterestedInFileDrag(const juce::StringArray& files) override;
  void filesDropped(const juce::StringArray& files, int x, int y) override;
  /// Number of blocks the web UI reported after building its stage (bridge round-trip; host tests read this).
  int uiReadyBlocks() const noexcept { return uiReadyBlocks_; }

 private:
  void timerCallback() override;
  static std::optional<juce::WebBrowserComponent::Resource> resource(const juce::String& url);

  BlokDustProcessor& proc_;
  int uiReadyBlocks_ = -1;
  bool dropsRouted_ = false;
  bool hadKeys_ = false;  // the editor's window had the keyboard at the last tick
  int dropToken_ = 0;
  juce::String pendingDrop_;
  std::unique_ptr<juce::FileChooser> patchChooser_;
  juce::WebBrowserComponent web_;
  KeyUpsToHost keyUps_{*this};  // Logic's Musical Typing gets its note-offs while the page has the keys
};

}  // namespace blokdust::plugin
