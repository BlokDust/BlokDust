#include "WebViewDrops.h"
#include "PatchFiles.h"

#include <TargetConditionals.h>
#include <os/log.h>
#include <mutex>
#import <Foundation/Foundation.h>
#if TARGET_OS_IOS
#import <UIKit/UIKit.h>
#endif
#if TARGET_OS_OSX
#import <AppKit/AppKit.h>
#endif

namespace blokdust::plugin {
#if TARGET_OS_IOS
void shareLink(juce::Component& editor, const juce::String& url, juce::Rectangle<int> anchor) {
  auto* peer = editor.getPeer();
  if (peer == nullptr) return;
  auto* view = static_cast<UIView*>(peer->getNativeHandle());
  UIResponder* r = view;
  while (r != nil && ![r isKindOfClass:[UIViewController class]]) r = r.nextResponder;
  auto* host = r != nil ? static_cast<UIViewController*>(r) : view.window.rootViewController;
  while (host.presentedViewController != nil) host = host.presentedViewController;
  if (host == nil) return;
  NSURL* link = [NSURL URLWithString:[NSString stringWithUTF8String:url.toRawUTF8()]];
  if (link == nil) return;
  auto* sheet = [[UIActivityViewController alloc] initWithActivityItems:@[link] applicationActivities:nil];
  sheet.modalPresentationStyle = UIModalPresentationPopover;
  const auto at = peer->getComponent().getLocalArea(&editor, anchor);
  sheet.popoverPresentationController.sourceView = view;
  sheet.popoverPresentationController.sourceRect = CGRectMake(at.getX(), at.getY(), at.getWidth(), at.getHeight());
  sheet.completionWithItemsHandler = ^(UIActivityType type, BOOL done, NSArray*, NSError*) {
    systemLog(done ? "share: sent (" + juce::String(type != nil ? type.UTF8String : "?") + ")" : juce::String("share: closed"));
  };
  [host presentViewController:sheet animated:YES completion:nil];
  [sheet release];
}
#endif

void systemLog(const juce::String& message) {
  static os_log_t log = os_log_create("com.funputs.blokdust", "editor");
  os_log(log, "%{public}s", message.toRawUTF8());
#if TARGET_OS_IOS
  // An iPad's system log needs Console and a cable; this copy sits in the App Group, where `bd plugin ios log` reads it
  // over the network (CHG-0025). Never called from the audio thread; kept under 256 KB.
  static std::mutex lock;
  const std::scoped_lock hold(lock);
  const auto file = patchfiles::root().getChildFile("Logs").getChildFile("blokdust.log");
  file.getParentDirectory().createDirectory();
  if (file.getSize() > (256 << 10)) file.moveFileTo(file.withFileExtension("old.log"));
  const juce::String who([NSBundle mainBundle].bundleIdentifier.UTF8String ?: "?");
  file.appendText(juce::Time::getCurrentTime().toISO8601(true) + " " + who + " " + message + "\n");
#endif
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
