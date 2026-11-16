#include "WebViewDrops.h"

#include <TargetConditionals.h>
#include <os/log.h>
#if TARGET_OS_OSX
#import <AppKit/AppKit.h>
#endif

namespace blokdust::plugin {
void systemLog(const juce::String& message) {
  static os_log_t log = os_log_create("com.blokdust.plugin", "editor");
  os_log(log, "%{public}s", message.toRawUTF8());
}

#if TARGET_OS_OSX

namespace {
bool isWebView(NSView* v) { return [NSStringFromClass([v class]) containsString:@"WKWebView"]; }
int unregisterWebViews(NSView* v) {
  int n = 0;
  if (isWebView(v)) { [v unregisterDraggedTypes]; ++n; }
  for (NSView* s in [v subviews]) n += unregisterWebViews(s);
  return n;
}
}  // namespace

bool routeFileDropsToEditor(juce::Component& c) {
  auto* peer = c.getPeer();
  if (!peer) return false;
  auto* root = static_cast<NSView*>(peer->getNativeHandle());
  return root && unregisterWebViews(root) > 0;
}

bool windowHasKeys(juce::Component& c) {
  auto* peer = c.getPeer();
  auto* root = peer ? static_cast<NSView*>(peer->getNativeHandle()) : nil;
  return root && [NSApp isActive] && [[root window] isKeyWindow];
}

KeyUpsToHost::KeyUpsToHost(juce::Component& c) : c_(c) {
  id m = [NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskKeyUp handler:^NSEvent*(NSEvent* e) {
    auto* peer = c_.getPeer();
    auto* root = peer ? static_cast<NSView*>(peer->getNativeHandle()) : nil;
    if (!root || [e window] != [root window]) return e;
    // Only when the web view has the keys (it swallows key-ups); JUCE's own views pass them on already.
    auto* first = [[e window] firstResponder];
    if (![first isKindOfClass:[NSView class]] || !isWebView(static_cast<NSView*>(first)) || ![static_cast<NSView*>(first) isDescendantOf:root]) return e;
    NSResponder* host = [root nextResponder];  // the DAW's view (or window) the editor sits in
    if (host) {
      ++forwarded_;
      NSEvent* keep = e;
      dispatch_async(dispatch_get_main_queue(), ^{ [host keyUp:keep]; });  // after the page has seen it
    }
    return e;
  }];
  monitor_ = static_cast<void*>([m retain]);  // manual retain/release (this file is not ARC)
}

KeyUpsToHost::~KeyUpsToHost() {
  if (!monitor_) return;
  id m = static_cast<id>(monitor_);
  [NSEvent removeMonitor:m];
  [m release];
}
#else
// iPadOS (AUv3 and the Standalone app, CHG-0025): no DAW window to share keys with and no Finder drags with paths.
// Files come from the document picker (Files app); key-ups need no help.
bool routeFileDropsToEditor(juce::Component&) { return true; }
bool windowHasKeys(juce::Component& c) { return c.isShowing(); }
KeyUpsToHost::KeyUpsToHost(juce::Component& c) : c_(c) {}
KeyUpsToHost::~KeyUpsToHost() = default;
#endif
}  // namespace blokdust::plugin
