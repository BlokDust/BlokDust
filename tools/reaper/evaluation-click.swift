// REAPER's evaluation dialog (shown at every start during the 60-day trial) waits for "Still evaluating" before REAPER
// runs any script. `bd plugin reaper` runs this beside REAPER: it presses that button, as the owner would, so the
// black-box plan can run. It needs Accessibility access (System Settings › Privacy & Security › Accessibility: add
// .cache/reaper-tools/evaluation-click once). Exits 0 when it pressed the button, 2 without access, 1 on timeout.
import ApplicationServices
import AppKit

if !AXIsProcessTrusted() { FileHandle.standardError.write("no accessibility access\n".data(using: .utf8)!); exit(2) }
let deadline = Date().addingTimeInterval(Double(CommandLine.arguments.dropFirst().first ?? "60") ?? 60)

func attr(_ e: AXUIElement, _ name: String) -> AnyObject? {
  var v: AnyObject?
  return AXUIElementCopyAttributeValue(e, name as CFString, &v) == .success ? v : nil
}
func find(_ e: AXUIElement, depth: Int = 0) -> AXUIElement? {
  if depth > 8 { return nil }
  if (attr(e, kAXRoleAttribute) as? String) == kAXButtonRole,
     let t = (attr(e, kAXTitleAttribute) as? String)?.lowercased(), t.contains("evaluat") { return e }
  for c in (attr(e, kAXChildrenAttribute) as? [AXUIElement]) ?? [] { if let f = find(c, depth: depth + 1) { return f } }
  return nil
}
while Date() < deadline {
  for app in NSRunningApplication.runningApplications(withBundleIdentifier: "com.cockos.reaper") {
    let ax = AXUIElementCreateApplication(app.processIdentifier)
    for w in (attr(ax, kAXWindowsAttribute) as? [AXUIElement]) ?? [] {
      if let b = find(w), (attr(b, kAXEnabledAttribute) as? Bool) ?? true {
        AXUIElementPerformAction(b, kAXPressAction as CFString)
        print("pressed")
        exit(0)
      }
    }
  }
  Thread.sleep(forTimeInterval: 0.25)
}
exit(1)
