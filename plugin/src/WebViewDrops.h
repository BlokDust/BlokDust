#pragma once
// Native web view fixes for the plugin editor (macOS; no-ops elsewhere):
//  - File drops (CHG-0004 3.7): the WebView would take them (giving the page a File without a
//  path); the DAW project
//    needs the path, so the WebView stops accepting file drags and they reach the JUCE editor.
//  - Key-ups (owner, Logic): WebKit passes a key-down the page ignores on to the host (Logic's
//  Musical Typing plays
//    the note) but never a key-up, so the note never ends. Key-ups in the editor's window are
//    passed on as well.
#include <juce_gui_basics/juce_gui_basics.h>

namespace blokdust::plugin {
/// A line in the system log (macOS unified log, subsystem "com.funputs.blokdust"; Windows debug
/// output): how the editor got on in a host we cannot attach to (Logic hosts AUs out of process).
/// `log stream --predicate 'subsystem == "com.funputs.blokdust"'` shows them.
void systemLog(const juce::String& message);
#if JUCE_IOS
/// iPad: the share menu for a link, as a popover pointing at `anchor` (in `editor`'s coordinates),
/// the way other apps show it. JUCE's ContentSharer opens a page sheet the size of the whole view
/// (owner, 2026-11-16, CHG-0025).
void shareLink(juce::Component& editor, const juce::String& url, juce::Rectangle<int> anchor);
#endif

/// The parent for a native file picker: the editor on iPad, where an AUv3's picker without one
/// never opens (JUCE); none on desktop, which keeps its free-standing dialogs.
inline juce::Component* pickerParent([[maybe_unused]] juce::Component* editor) {
#if JUCE_IOS
  return editor;
#else
  return nullptr;
#endif
}

/// Stop native web views under `c` from claiming file drags. Returns true once done (call again
/// until it is).
bool routeFileDropsToEditor(juce::Component& c);

/// True while the window `c` sits in has the keyboard (key window of the active app). Ableton:
/// clicking into the DAW while a computer key is held gives the web view neither the key-up nor a
/// blur, so the editor watches this.
bool windowHasKeys(juce::Component& c);

/// While alive, key-ups that reach a web view under `c` are also sent to the host view `c` sits in.
class KeyUpsToHost {
 public:
  explicit KeyUpsToHost(juce::Component& c);
  ~KeyUpsToHost();
  KeyUpsToHost(const KeyUpsToHost&) = delete;
  KeyUpsToHost& operator=(const KeyUpsToHost&) = delete;
  /// Key-ups passed on so far (host tests).
  int forwarded() const noexcept { return forwarded_; }

 private:
  [[maybe_unused]] juce::Component& c_;  // macOS only (iPad has no key monitor)
  [[maybe_unused]] void* monitor_ = nullptr;
  int forwarded_ = 0;
};
}  // namespace blokdust::plugin
