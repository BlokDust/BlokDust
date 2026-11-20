#include "PluginEditor.h"
#include "AccountStore.h"
#if JUCE_IOS
#include "ios/NativeSignIn.h"
#endif
#include "PatchFiles.h"
#include "Telemetry.h"

#include <BinaryData.h>

namespace blokdust::plugin {

namespace {
juce::String mimeFor(const juce::String& name) {
  if (name.endsWithIgnoreCase(".html")) return "text/html";
  if (name.endsWithIgnoreCase(".js")) return "text/javascript";
  if (name.endsWithIgnoreCase(".css")) return "text/css";
  if (name.endsWithIgnoreCase(".json")) return "application/json";
  if (name.endsWithIgnoreCase(".png")) return "image/png";
  if (name.endsWithIgnoreCase(".woff2")) return "font/woff2";
  if (name.endsWithIgnoreCase(".wasm")) return "application/wasm";
  return "application/octet-stream";
}
}  // namespace

std::optional<juce::WebBrowserComponent::Resource> BlokDustEditor::resource(const juce::String& url) {
  // Web assets are embedded as BinaryData keyed by original file name (Vite asset names are content-hashed, so unique).
  auto name = url.fromLastOccurrenceOf("/", false, false).upToFirstOccurrenceOf("?", false, false);
  if (name.isEmpty()) name = "index.html";
  for (int i = 0; i < BinaryData::namedResourceListSize; ++i) {
    if (name != BinaryData::originalFilenames[i]) continue;
    int size = 0;
    const char* data = BinaryData::getNamedResource(BinaryData::namedResourceList[i], size);
    std::vector<std::byte> bytes(static_cast<std::size_t>(size));
    std::memcpy(bytes.data(), data, static_cast<std::size_t>(size));
    return juce::WebBrowserComponent::Resource{std::move(bytes), mimeFor(name)};
  }
  return std::nullopt;
}

BlokDustEditor::BlokDustEditor(BlokDustProcessor& p)
    : AudioProcessorEditor(p), proc_(p),
      web_(juce::WebBrowserComponent::Options{}
#if JUCE_WINDOWS
               // WebView2 defaults its data folder to beside the host's exe, unwritable under Program Files.
               .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
               .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2{}.withUserDataFolder(
                   juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory).getChildFile("BlokDust").getChildFile("WebView2")))
#endif
               .withNativeIntegrationEnabled()
               .withKeepPageLoadedWhenBrowserIsHidden()
               .withResourceProvider([](const juce::String& url) { return resource(url); })
               .withEventListener("bd_hello", [this](const juce::var&) {
                 systemLog("page: hello");
                 reloadPatch();
                 // Settings › About's usage stats switch shows this install's choice (SHARING-0010 R7).
                 auto* a = new juce::DynamicObject();
                 a->setProperty("on", telemetry::enabled());
                 web_.emitEventIfBrowserIsVisible("bd_analytics", juce::var(a));
                 sendAccount();
               })
               // Plugin sign-in (CHG-0039, SHARING-0011): the page keeps the key it was given; signing out drops it.
               .withEventListener("bd_accountSave", [](const juce::var& v) {
                 account::write(v.getProperty("key", "").toString().toStdString(), v.getProperty("handle", "").toString().toStdString());
               })
               .withEventListener("bd_accountClear", [](const juce::var&) { account::clear(); })
#if JUCE_IOS
               // The iPad app signs in natively (SHARING-0011): the system's sheet over this window; the answer to the page.
               .withEventListener("bd_nativeApple", [this](const juce::var& v) {
                 nativesignin::apple(getPeer() != nullptr ? getPeer()->getNativeHandle() : nullptr, v.getProperty("nonce", "").toString(), [safe = juce::Component::SafePointer<BlokDustEditor>(this)](juce::var r) {
                   juce::MessageManager::callAsync([safe, r] { if (safe != nullptr) safe->web_.emitEventIfBrowserIsVisible("bd_nativeAppleDone", r); });
                 });
               })
               .withEventListener("bd_nativePasskey", [this](const juce::var& v) {
                 nativesignin::passkey(getPeer() != nullptr ? getPeer()->getNativeHandle() : nullptr, v.getProperty("rpId", "").toString(), v.getProperty("challenge", "").toString(), [safe = juce::Component::SafePointer<BlokDustEditor>(this)](juce::var r) {
                   juce::MessageManager::callAsync([safe, r] { if (safe != nullptr) safe->web_.emitEventIfBrowserIsVisible("bd_nativePasskeyDone", r); });
                 });
               })
#endif
               // Power: off, on, or host (the DAW's transport has it). The page draws the mode; the processor owns it.
               .withEventListener("bd_powerMode", [this](const juce::var& v) { proc_.setPowerMode(static_cast<int>(v.getProperty("mode", 1))); })
               .withEventListener("bd_stats", [this](const juce::var& v) {
                 systemLog("page: " + v.getProperty("fps", 0).toString() + " fps, " + v.getProperty("snapshots", 0).toString() + " snapshots/s (sent "
                           + juce::String(juce::roundToInt(sentPerSecond())) + "), " + v.getProperty("w", 0).toString() + "x" + v.getProperty("h", 0).toString()
                           + " @" + v.getProperty("dpr", 1).toString());
               })
               .withEventListener("bd_analytics", [](const juce::var& v) { telemetry::setEnabled(static_cast<bool>(v.getProperty("on", true))); })
               .withEventListener("bd_ready", [this](const juce::var& v) {
                 uiReadyBlocks_ = static_cast<int>(v.getProperty("blocks", -1));
                 systemLog("page: ready, " + juce::String(uiReadyBlocks_) + " blocks");
                 if (auto* o = v.getDynamicObject()) {
                   o->setProperty("snapshotSeq", static_cast<juce::int64>(proc_.snapshotSeq()));
                   o->setProperty("wasm", resource("blokdust.wasm").has_value());  // host tests: the Wavetable's picture needs it
                 }
                 // Test hook: report the UI round-trip to a file when BLOKDUST_DIAG_FILE is set (host tests only).
                 if (juce::SystemStats::getEnvironmentVariable("BLOKDUST_SUPPORT_SMOKE", {}) == "1") {
                   // Explicit test-host mode: exercise the actual WebView form and its cross-origin HTTP submission.
                   web_.evaluateJavascript(R"JS((() => {
                     let reportId = '';
                     const originalFetch = window.fetch.bind(window);
                     window.fetch = async (...args) => {
                       const response = await originalFetch(...args);
                       if (String(args[0]).includes('/api/support') && response.ok) reportId = (await response.clone().json()).id;
                       return response;
                     };
                     const initialise = () => {
                     const settings = window.__bd_probe.scene.SettingsPanel;
                     if (!settings.MenuItems[1]) { setTimeout(initialise, 50); return; }
                     settings._OpenTab = 1; settings.OpenPanel();
                     document.getElementById('feedback-message').value = 'CHG-0036 native plugin support smoke test';
                     document.getElementById('feedback-panel').requestSubmit();
                     let tries = 0;
                     const timer = setInterval(() => {
                       const status = document.getElementById('feedback-status').textContent;
                       const success = status === 'Message sent';  // the form's status line (owner, 2026-11-18: no thanks line)
                       if (success || ++tries >= 120) {
                         clearInterval(timer);
                         window.__JUCE__.backend.emitEvent('bd_supportSmoke', { success, status, id: reportId });
                       }
                     }, 100);
                     }; initialise();
                   })())JS");
                 } else if (auto path = juce::SystemStats::getEnvironmentVariable("BLOKDUST_DIAG_FILE", {}); path.isNotEmpty())
                   juce::File(path).replaceWithText(juce::JSON::toString(v, true));
               })
               .withEventListener("bd_supportSmoke", [](const juce::var& v) {
                 if (juce::SystemStats::getEnvironmentVariable("BLOKDUST_SUPPORT_SMOKE", {}) == "1")
                   if (auto path = juce::SystemStats::getEnvironmentVariable("BLOKDUST_DIAG_FILE", {}); path.isNotEmpty())
                     juce::File(path).replaceWithText(juce::JSON::toString(v, true));
               })
               .withEventListener("bd_automation", [this](const juce::var& v) {
                 proc_.setAutomation(static_cast<int>(v.getProperty("slot", 0)), static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))),
                                     v.getProperty("param", "").toString().toStdString());
               })
               .withEventListener("bd_view", [this](const juce::var& v) {
                 proc_.setView(nlohmann::json::parse(juce::JSON::toString(v, true).toStdString()));
               })
               .withEventListener("bd_labels", [this](const juce::var& v) {
                 proc_.setLabels(nlohmann::json::parse(juce::JSON::toString(v.getProperty("labels", juce::var()), true).toStdString()));
               })
               .withEventListener("bd_connectionOrder", [this](const juce::var& v) {
                 proc_.setConnectionOrder(nlohmann::json::parse(juce::JSON::toString(v.getProperty("order", juce::var()), true).toStdString()));
               })
               // Stage blocks (CHG-0038): which world the snapshots show, and what is inside each Stage (the DAW's state).
               .withEventListener("bd_stageView", [this](const juce::var& v) { proc_.setStageView(static_cast<BlockId>(static_cast<int>(v.getProperty("stage", 0)))); })
               .withEventListener("bd_macros", [this](const juce::var& v) {
                 proc_.setMacros(nlohmann::json::parse(juce::JSON::toString(v.getProperty("macros", juce::var()), true).toStdString()));
               })
               .withEventListener("bd_commands", [this](const juce::var& v) {
                 proc_.applyUiCommands(nlohmann::json::parse(juce::JSON::toString(v.getProperty("commands", juce::var()), true).toStdString()));
               })
               // Samples (CHG-0004 3.6/3.7): loaded natively; the UI only shows them.
               .withEventListener("bd_pickFile", [this](const juce::var& v) { proc_.pickFile(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))), static_cast<BlockId>(static_cast<int>(v.getProperty("stage", 0)))); })
               .withEventListener("bd_loadUrl", [this](const juce::var& v) {
                 const auto j = nlohmann::json::parse(juce::JSON::toString(v, true).toStdString());
                 proc_.loadFreesound(j.value("id", 0u), j.value("ref", nlohmann::json::object()), j.value("display", nlohmann::json::object()), j.value("maxSeconds", 0.0), j.value("stage", 0u));
               })
               .withEventListener("bd_samplesHello", [this](const juce::var&) { for (const auto& s : proc_.sampleInfos()) sendSampleInfo(s); })
               // Recorder and SampleGen (owner, Logic): the processor records / keeps their audio as files.
               .withEventListener("bd_record", [this](const juce::var& v) {
                 proc_.setRecording(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))), static_cast<bool>(v.getProperty("on", false)), static_cast<BlockId>(static_cast<int>(v.getProperty("stage", 0))));
               })
               .withEventListener("bd_sampleData", [this](const juce::var& v) {
                 std::vector<float> mono;
                 if (const auto* a = v.getProperty("data", juce::var()).getArray()) { mono.reserve(static_cast<std::size_t>(a->size())); for (const auto& x : *a) mono.push_back(static_cast<float>(static_cast<double>(x))); }
                 proc_.useGenerated(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))), mono, static_cast<double>(v.getProperty("sampleRate", 44100.0)), static_cast<BlockId>(static_cast<int>(v.getProperty("stage", 0))));
               })
               .withEventListener("bd_reveal", [this](const juce::var& v) { proc_.revealSample(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))), static_cast<BlockId>(static_cast<int>(v.getProperty("stage", 0)))); })
               .withEventListener("bd_learnCC", [this](const juce::var& v) { proc_.learnCc(static_cast<int>(v.getProperty("slot", 0))); })
               // Patches panel (CHG-0005): `.blokdust` files in ~/Music/BlokDust/Patches; replies carry the request's `req`.
               .withEventListener("bd_patchList", [this](const juce::var& v) {
                 auto r = nlohmann::json{{"req", static_cast<int>(v.getProperty("req", 0))}, {"items", patchfiles::list(patchfiles::folder())}};
                 web_.emitEventIfBrowserIsVisible("bd_patchList", juce::JSON::parse(juce::String(r.dump())));
               })
               // SAVE TO COMPUTER: the user picks where, starting in the patches folder (owner, 2026-11-10).
               .withEventListener("bd_patchSave", [this](const juce::var& v) {
                 const auto title = v.getProperty("title", "").toString();
                 const int req = static_cast<int>(v.getProperty("req", 0));
#if JUCE_IOS
                 // iPad (CHG-0025 task 5): the document picker exports a copy of a file we write first (to Files, iCloud
                 // Drive, another app's folder). The picker's URL is all we learn of where it went.
                 const auto tmp = patchfiles::saveTo(juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile(patchfiles::safeName(title) + ".blokdust"),
                                                     title, nlohmann::json::parse(proc_.patchJson()));
                 patchChooser_ = std::make_unique<juce::FileChooser>("Save a BlokDust patch", tmp, "*.blokdust", true, false, pickerParent(this));
                 patchChooser_->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles, [this, req, tmp](const juce::FileChooser& fc) {
                   const auto url = fc.getURLResult();
                   tmp.deleteFile();
                   auto r = nlohmann::json{{"req", req}, {"ok", !url.isEmpty()}, {"path", url.toString(false).toStdString()}};
                   web_.emitEventIfBrowserIsVisible("bd_patchSaved", juce::JSON::parse(juce::String(r.dump())));
                 });
                 return;
#endif
                 patchChooser_ = std::make_unique<juce::FileChooser>("Save a BlokDust patch", patchfiles::folder().getChildFile(patchfiles::safeName(title) + ".blokdust"), "*.blokdust");
                 patchChooser_->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles | juce::FileBrowserComponent::warnAboutOverwriting,
                   [this, title, req](const juce::FileChooser& fc) {
                     const auto chosen = fc.getResult();
                     const auto f = chosen == juce::File{} ? juce::File{} : patchfiles::saveTo(chosen, title, nlohmann::json::parse(proc_.patchJson()));
                     auto r = nlohmann::json{{"req", req}, {"ok", f.existsAsFile()}, {"path", f.getFullPathName().toStdString()}};
                     web_.emitEventIfBrowserIsVisible("bd_patchSaved", juce::JSON::parse(juce::String(r.dump())));
                   });
               })
               .withEventListener("bd_patchRead", [this](const juce::var& v) {
                 const juce::File f(v.getProperty("path", "").toString());
                 sendPatchFile(f, "open", static_cast<int>(v.getProperty("req", 0)));
               })
               // FROM YOUR COMPUTER: one picker; the page then asks Open or Insert.
               .withEventListener("bd_patchPick", [this](const juce::var& v) {
                 // `stage`: a Stage panel's LOAD PATCH (CHG-0038); the reply names it, and the page fills that Stage.
                 const int stage = static_cast<int>(v.getProperty("stage", 0));
                 patchChooser_ = std::make_unique<juce::FileChooser>("Choose a BlokDust patch", patchfiles::folder(), "*.blokdust;*.json", true, false, pickerParent(this));
                 patchChooser_->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this, stage](const juce::FileChooser& fc) {
#if JUCE_IOS
                   // iPad: a document-picker URL outside our sandbox; JUCE's stream holds its security-scoped access.
                   if (const auto url = fc.getURLResult(); !url.isEmpty())
                     if (auto in = url.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress))) {
                       const auto name = juce::URL::removeEscapeChars(url.getFileName());
                       sendPatchText(in->readEntireStreamAsString(), name.upToLastOccurrenceOf(".", false, false), name, "choose", -1, stage);
                     }
#else
                   if (const auto f = fc.getResult(); f.existsAsFile()) sendPatchFile(f, "choose", -1, stage);
#endif
                 });
               })
               .withEventListener("bd_patchApply", [this](const juce::var& v) {
                 try { proc_.applyPatch(nlohmann::json::parse(v.getProperty("patch", "{}").toString().toStdString()), v.getProperty("mode", "") == "open"); }
                 catch (const std::exception& e) { DBG("BlokDust: bad patch: " << e.what()); }
               })
               // A patch's bin (OPEN tab): the file goes to the Trash, not deleted outright (iPad has no Trash: deleted). Only
               // files in the patches folder.
               .withEventListener("bd_patchDelete", [this](const juce::var& v) {
                 const juce::File f(v.getProperty("path", "").toString());
                 const bool ok = f.existsAsFile() && f.isAChildOf(patchfiles::folder()) && f.hasFileExtension("blokdust") && patchfiles::remove(f);
                 auto r = nlohmann::json{{"req", static_cast<int>(v.getProperty("req", 0))}, {"ok", ok}};
                 web_.emitEventIfBrowserIsVisible("bd_patchDeleted", juce::JSON::parse(juce::String(r.dump())));
               })
               // CREATE SHARE LINK (and the About links): open a web page in the user's browser. https only.
               .withEventListener("bd_openUrl", [this](const juce::var& v) {
                 const auto url = v.getProperty("url", "").toString();
                 if (!url.startsWith("https://")) return;
#if JUCE_IOS
                 // iPadOS gives an AUv3 no way to open Safari (CHG-0025 task 7): the link goes to the clipboard, with a
                 // note. The BlokDust app itself opens links as usual.
                 if (juce::SystemStats::isRunningInAppExtensionSandbox()) {
                   juce::SystemClipboard::copyTextToClipboard(url);
                   systemLog("link: copied to the clipboard (extension)");
                   linkNote_ = juce::NativeMessageBox::showScopedAsync(
                       juce::MessageBoxOptions::makeOptionsOk(juce::MessageBoxIconType::InfoIcon, "Link copied",
                                                              "BlokDust can't open Safari from inside another app. Paste the link into Safari to open it.")
                           .withAssociatedComponent(this), nullptr);
                   return;
                 }
#endif
                 juce::URL(url).launchInDefaultBrowser();
               })
               // iPad: CREATE SHARE LINK sends the patch's link with the share menu (Messages, WhatsApp, Mail…), in the
               // app and in a host (owner, 2026-11-16, CHG-0025). Elsewhere the page opens the site instead.
               .withEventListener("bd_share", [this](const juce::var& v) {
                 const auto url = v.getProperty("url", "").toString();
                 if (!url.startsWith("https://")) return;
#if JUCE_IOS
                 systemLog("share: menu opened");
                 const int x = v.getProperty("x", getWidth() / 2), y = v.getProperty("y", getHeight() / 2);
                 shareLink(*this, url, {x - 20, y - 20, 40, 40});
#else
                 juce::URL(url).launchInDefaultBrowser();
#endif
               })
               .withEventListener("bd_dropTarget", [this](const juce::var& v) {
                 if (static_cast<int>(v.getProperty("token", -1)) != dropToken_ || pendingDrop_.isEmpty()) return;
                 proc_.loadFile(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))), juce::File(pendingDrop_), static_cast<BlockId>(static_cast<int>(v.getProperty("stage", 0))));
                 pendingDrop_.clear();
               })) {
  proc_.onSampleInfo = [this](const nlohmann::json& s) { sendSampleInfo(s); };
  proc_.onCcLearned = [this](int slot, int cc) {
    auto* obj = new juce::DynamicObject();
    obj->setProperty("slot", slot); obj->setProperty("cc", cc);
    web_.emitEventIfBrowserIsVisible("bd_ccLearned", juce::var(obj));
  };
  addAndMakeVisible(web_);
#if JUCE_IOS
  // iPad (CHG-0025 task 8): the host sizes the view (AUM's windows are small, GarageBand's panel wide): no corner to
  // drag, and a smaller floor so the page lays itself out instead of being clipped.
  setResizable(true, false);
  setResizeLimits(320, 240, 4096, 4096);
#else
  setResizable(true, true);
  setResizeLimits(640, 400, 4096, 4096);
#endif
  setSize(1280, 800);
  systemLog(juce::String(proc_.isFx() ? "fx" : "instrument") + " editor: loading " + juce::WebBrowserComponent::getResourceProviderRoot() + " (host " + juce::PluginHostType().getHostDescription() + ")");
  web_.goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
  startTimerHz(30);
  // Usage stats (SHARING-0010 R8): BlokDust's window opening counts as using it today; at most one ping a day.
  telemetry::dailyPing(telemetryPool_, proc_.wrapperType, proc_.isFx());
}

/// The key this plugin signed in with (if any), what it calls itself, and whether it can open a browser (an AUv3
/// can't open Safari: the page shows a QR code instead).
void BlokDustEditor::sendAccount() {
  const bool standalone = proc_.wrapperType == juce::AudioProcessor::wrapperType_Standalone;
  auto j = account::read();
  j["name"] = account::deviceName(standalone).toStdString();
#if JUCE_IOS
  j["browser"] = standalone;
#if BLOKDUST_NATIVE_SIGN_IN
  j["native"] = standalone;  // Sign in with Apple and passkeys: the app's own (in a host they'd be the host's)
#endif
#else
  j["browser"] = true;
#endif
  web_.emitEventIfBrowserIsVisible("bd_account", juce::JSON::parse(juce::String(j.dump())));
}

void BlokDustEditor::sendSampleInfo(const nlohmann::json& s) {
  web_.emitEventIfBrowserIsVisible("bd_sampleInfo", juce::JSON::parse(juce::String(s.dump())));
}

void BlokDustEditor::sendPatchFile(const juce::File& f, const juce::String& mode, int req, int stage) {
  if (!f.existsAsFile()) return;
  sendPatchText(f.loadFileAsString(), f.getFileNameWithoutExtension(), f.getFileName(), mode, req, stage);
}

void BlokDustEditor::sendPatchText(const juce::String& text, const juce::String& name, const juce::String& file, const juce::String& mode, int req, int stage) {
  auto* obj = new juce::DynamicObject();
  if (req >= 0) obj->setProperty("req", req);
  if (stage > 0) obj->setProperty("stage", stage);
  obj->setProperty("text", text);
  obj->setProperty("name", name);
  obj->setProperty("file", file);
  obj->setProperty("mode", mode);
  web_.emitEventIfBrowserIsVisible("bd_patchFile", juce::var(obj));
}

void BlokDustEditor::reloadPatch() {
  auto* obj = new juce::DynamicObject();
  obj->setProperty("patch", juce::String(proc_.patchJson()));
  // The engine's id for each patch block: the page must use them (the engine outlives the editor; once blocks were
  // deleted its ids are not 1..N, and connections, moves and params would name the wrong blocks; owner, Ableton).
  auto* ids = new juce::DynamicObject();
  for (const auto& [id, key] : proc_.blockIds()) ids->setProperty(juce::Identifier(juce::String(key)), static_cast<int>(id));
  obj->setProperty("ids", juce::var(ids));
  obj->setProperty("innerIds", juce::JSON::parse(juce::String(proc_.innerIds().dump())));  // each Stage's inner blocks (CHG-0038)
  // The standalone app has no DAW to pass keys on to: the page keeps every plain key, or macOS sounds its alert for
  // each one nobody takes (owner, 2026-11-13, CHG-0013).
  obj->setProperty("standalone", proc_.wrapperType == juce::AudioProcessor::wrapperType_Standalone);
#if JUCE_IOS
  obj->setProperty("ios", true);  // no Trash, no Finder (CHG-0025)
#endif
  obj->setProperty("powerMode", proc_.powerMode());
  obj->setProperty("hostPlaying", proc_.hostIsPlaying());
  auto* system = new juce::DynamicObject();
  system->setProperty("surface", juce::JUCEApplicationBase::isStandaloneApp() ? "standalone" : "plugin");
  system->setProperty("os", juce::SystemStats::getOperatingSystemName());
  system->setProperty("host", juce::PluginHostType().getHostDescription());
  system->setProperty("format", juce::AudioProcessor::getWrapperTypeDescription(proc_.wrapperType));
  system->setProperty("sampleRate", proc_.getSampleRate());
  system->setProperty("bufferSize", proc_.getBlockSize());
  web_.emitEventIfBrowserIsVisible("bd_supportSystem", juce::var(system));
  web_.emitEventIfBrowserIsVisible("bd_patch", juce::var(obj));
}

bool BlokDustEditor::isInterestedInFileDrag(const juce::StringArray& files) {
  for (const auto& f : files)
    if (juce::File(f).hasFileExtension("wav;aif;aiff;flac;ogg;mp3;m4a;caf;aac;blokdust")) return true;
  return false;
}

void BlokDustEditor::filesDropped(const juce::StringArray& files, int x, int y) {
  // A patch file dropped on the editor: the page asks Open or Insert (CHG-0005).
  for (const auto& f : files) if (juce::File(f).hasFileExtension("blokdust")) { sendPatchFile(juce::File(f), "choose", -1); return; }
  for (const auto& f : files) if (isInterestedInFileDrag({f})) { pendingDrop_ = f; break; }
  auto* obj = new juce::DynamicObject();
  obj->setProperty("x", x); obj->setProperty("y", y); obj->setProperty("token", ++dropToken_);
  web_.emitEventIfBrowserIsVisible("bd_dropAt", juce::var(obj));
}

void BlokDustEditor::timerCallback() {
  if (juce::Time::getMillisecondCounterHiRes() - lastTick_ > 100) tick();
}

void BlokDustEditor::tick() {
  lastTick_ = juce::Time::getMillisecondCounterHiRes();
  if (!dropsRouted_) dropsRouted_ = routeFileDropsToEditor(*this);
  proc_.idleTick();  // a disabled plugin (no audio callbacks): the stage still runs
  // Clicking into the DAW while a computer key is held: the page sees no key-up (owner, Ableton), so end its notes.
  if (const bool keys = windowHasKeys(*this); keys != hadKeys_) {
    hadKeys_ = keys;
    if (!keys) { web_.emitEventIfBrowserIsVisible("bd_keysLost", juce::var(new juce::DynamicObject())); proc_.releasePageKeys(); }
  }
  // The DAW's play state, for the power switch's host mode (it shows playing or stopped).
  if (const int state = proc_.powerMode() * 2 + (proc_.hostIsPlaying() ? 1 : 0); state != hostState_) {
    hostState_ = state;
    auto* h = new juce::DynamicObject();
    h->setProperty("mode", proc_.powerMode()); h->setProperty("playing", proc_.hostIsPlaying());
    web_.emitEventIfBrowserIsVisible("bd_hostState", juce::var(h));
  }
  const Snapshot* s = proc_.snapshots().read();
  if (s) proc_.syncToggles(*s);  // Toggles hits switched: into the patch, and onto the page below (CHG-0013)
  // Dust moves (host automation, MIDI CC) show on the page's sliders, live (owner, Ableton, 2026-11-12).
  proc_.flushDust();
  if (auto ups = proc_.takeParamUpdates(); !ups.empty()) {
    juce::Array<juce::var> values;
    for (const auto& u : ups) {
      auto* o = new juce::DynamicObject();
      o->setProperty("id", static_cast<int>(u.id)); o->setProperty("param", juce::String(u.param)); o->setProperty("value", u.value);
      values.add(juce::var(o));
    }
    auto* obj = new juce::DynamicObject();
    obj->setProperty("values", values);
    web_.emitEventIfBrowserIsVisible("bd_paramValues", juce::var(obj));
  }
  if (!s) return;
  juce::Array<juce::var> particles, pairs, powered, beams, playheads, monitors;
  for (int i = 0; i < s->monitorCount * 5; ++i) monitors.add(s->monitors[static_cast<std::size_t>(i)]);
  for (int i = 0; i < s->playheadCount * 2; ++i) playheads.add(s->playheads[static_cast<std::size_t>(i)]);
  for (int i = 0; i < s->beamCount * 4; ++i) beams.add(s->beams[static_cast<std::size_t>(i)]);
  for (int i = 0; i < s->particleCount * 3; ++i) particles.add(s->particles[static_cast<std::size_t>(i)]);
  for (int i = 0; i < s->pairCount * 2; ++i) pairs.add(static_cast<int>(s->pairs[static_cast<std::size_t>(i)]));
  for (int i = 0; i < s->poweredCount; ++i) powered.add(static_cast<int>(s->powered[static_cast<std::size_t>(i)]));
  auto* obj = new juce::DynamicObject();
  obj->setProperty("view", static_cast<int>(s->view));  // the world it shows (CHG-0038): the page drops another world's
  obj->setProperty("particles", particles);
  obj->setProperty("connections", pairs);
  obj->setProperty("powered", powered);
  obj->setProperty("beams", beams);
  obj->setProperty("playheads", playheads);
  obj->setProperty("monitors", monitors);
  web_.emitEventIfBrowserIsVisible("bd_snapshot", juce::var(obj));
  ++sent_;
}

double BlokDustEditor::sentPerSecond() {
  const auto now = juce::Time::getMillisecondCounterHiRes();
  const double rate = sentSince_ > 0 ? sent_ * 1000.0 / (now - sentSince_) : 0;
  sent_ = 0; sentSince_ = now;
  return rate;
}

}  // namespace blokdust::plugin
