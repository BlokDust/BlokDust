#include "WebViewDrops.h"

#if JUCE_WINDOWS
#include <windows.h>
#endif

// Windows/Linux: not routed yet (WebView2 would need AllowExternalDrop = false on its controller, which JUCE does not
// expose). Drops there go to the page, which loads the file for the session only. Key-ups need no help there.
namespace blokdust::plugin {
void systemLog(const juce::String& message) { juce::Logger::outputDebugString("BlokDust: " + message); }
bool routeFileDropsToEditor(juce::Component&) { return true; }
bool windowHasKeys(juce::Component& c) {
#if JUCE_WINDOWS
  auto* peer = c.getPeer();
  if (!peer) return false;
  auto* hwnd = static_cast<HWND>(peer->getNativeHandle());
  return GetAncestor(GetForegroundWindow(), GA_ROOT) == GetAncestor(hwnd, GA_ROOT);
#else
  return c.isShowing();
#endif
}
KeyUpsToHost::KeyUpsToHost(juce::Component& c) : c_(c) {}
KeyUpsToHost::~KeyUpsToHost() = default;
}  // namespace blokdust::plugin
