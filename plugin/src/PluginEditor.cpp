#include "PluginEditor.h"
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
               })
               .withEventListener("bd_analytics", [](const juce::var& v) { telemetry::setEnabled(static_cast<bool>(v.getProperty("on", true))); })
               .withEventListener("bd_ready", [this](const juce::var& v) {
                 uiReadyBlocks_ = static_cast<int>(v.getProperty("blocks", -1));
                 systemLog("page: ready, " + juce::String(uiReadyBlocks_) + " blocks");
                 if (auto* o = v.getDynamicObject()) o->setProperty("snapshotSeq", static_cast<juce::int64>(proc_.snapshotSeq()));
                 // Test hook: report the UI round-trip to a file when BLOKDUST_DIAG_FILE is set (host tests only).
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
               .withEventListener("bd_connectionOrder", [this](const juce::var& v) {
                 proc_.setConnectionOrder(nlohmann::json::parse(juce::JSON::toString(v.getProperty("order", juce::var()), true).toStdString()));
               })
               .withEventListener("bd_commands", [this](const juce::var& v) {
                 proc_.applyUiCommands(nlohmann::json::parse(juce::JSON::toString(v.getProperty("commands", juce::var()), true).toStdString()));
               })
               // Samples (CHG-0004 3.6/3.7): loaded natively; the UI only shows them.
               .withEventListener("bd_pickFile", [this](const juce::var& v) { proc_.pickFile(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0)))); })
               .withEventListener("bd_loadUrl", [this](const juce::var& v) {
                 const auto j = nlohmann::json::parse(juce::JSON::toString(v, true).toStdString());
                 proc_.loadFreesound(j.value("id", 0u), j.value("ref", nlohmann::json::object()), j.value("display", nlohmann::json::object()), j.value("maxSeconds", 0.0));
               })
               .withEventListener("bd_samplesHello", [this](const juce::var&) { for (const auto& s : proc_.sampleInfos()) sendSampleInfo(s); })
               // Recorder and SampleGen (owner, Logic): the processor records / keeps their audio as files.
               .withEventListener("bd_record", [this](const juce::var& v) {
                 proc_.setRecording(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))), static_cast<bool>(v.getProperty("on", false)));
               })
               .withEventListener("bd_sampleData", [this](const juce::var& v) {
                 std::vector<float> mono;
                 if (const auto* a = v.getProperty("data", juce::var()).getArray()) { mono.reserve(static_cast<std::size_t>(a->size())); for (const auto& x : *a) mono.push_back(static_cast<float>(static_cast<double>(x))); }
                 proc_.useGenerated(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))), mono, static_cast<double>(v.getProperty("sampleRate", 44100.0)));
               })
               .withEventListener("bd_reveal", [this](const juce::var& v) { proc_.revealSample(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0)))); })
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
               .withEventListener("bd_patchPick", [this](const juce::var&) {
                 patchChooser_ = std::make_unique<juce::FileChooser>("Choose a BlokDust patch", patchfiles::folder(), "*.blokdust;*.json");
                 patchChooser_->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& fc) {
                   if (const auto f = fc.getResult(); f.existsAsFile()) sendPatchFile(f, "choose", -1);
                 });
               })
               .withEventListener("bd_patchApply", [this](const juce::var& v) {
                 try { proc_.applyPatch(nlohmann::json::parse(v.getProperty("patch", "{}").toString().toStdString()), v.getProperty("mode", "") == "open"); }
                 catch (const std::exception& e) { DBG("BlokDust: bad patch: " << e.what()); }
               })
               // A patch's bin (OPEN tab): the file goes to the Trash, not deleted outright. Only files in the patches folder.
               .withEventListener("bd_patchDelete", [this](const juce::var& v) {
                 const juce::File f(v.getProperty("path", "").toString());
                 const bool ok = f.existsAsFile() && f.isAChildOf(patchfiles::folder()) && f.hasFileExtension("blokdust") && f.moveToTrash();
                 auto r = nlohmann::json{{"req", static_cast<int>(v.getProperty("req", 0))}, {"ok", ok}};
                 web_.emitEventIfBrowserIsVisible("bd_patchDeleted", juce::JSON::parse(juce::String(r.dump())));
               })
               // CREATE SHARE LINK (and the About links): open a web page in the user's browser. https only.
               .withEventListener("bd_openUrl", [](const juce::var& v) {
                 const auto url = v.getProperty("url", "").toString();
                 if (url.startsWith("https://")) juce::URL(url).launchInDefaultBrowser();
               })
               .withEventListener("bd_dropTarget", [this](const juce::var& v) {
                 if (static_cast<int>(v.getProperty("token", -1)) != dropToken_ || pendingDrop_.isEmpty()) return;
                 proc_.loadFile(static_cast<BlockId>(static_cast<int>(v.getProperty("id", 0))), juce::File(pendingDrop_));
                 pendingDrop_.clear();
               })) {
  proc_.onSampleInfo = [this](const nlohmann::json& s) { sendSampleInfo(s); };
  proc_.onCcLearned = [this](int slot, int cc) {
    auto* obj = new juce::DynamicObject();
    obj->setProperty("slot", slot); obj->setProperty("cc", cc);
    web_.emitEventIfBrowserIsVisible("bd_ccLearned", juce::var(obj));
  };
  addAndMakeVisible(web_);
  setResizable(true, true);
  setResizeLimits(640, 400, 4096, 4096);
  setSize(1280, 800);
  systemLog(juce::String(proc_.isFx() ? "fx" : "instrument") + " editor: loading " + juce::WebBrowserComponent::getResourceProviderRoot() + " (host " + juce::PluginHostType().getHostDescription() + ")");
  web_.goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
  startTimerHz(30);
  // Usage stats (SHARING-0010 R8): BlokDust's window opening counts as using it today; at most one ping a day.
  telemetry::dailyPing(telemetryPool_, proc_.wrapperType, proc_.isFx());
}

void BlokDustEditor::sendSampleInfo(const nlohmann::json& s) {
  web_.emitEventIfBrowserIsVisible("bd_sampleInfo", juce::JSON::parse(juce::String(s.dump())));
}

void BlokDustEditor::sendPatchFile(const juce::File& f, const juce::String& mode, int req) {
  if (!f.existsAsFile()) return;
  auto* obj = new juce::DynamicObject();
  if (req >= 0) obj->setProperty("req", req);
  obj->setProperty("text", f.loadFileAsString());
  obj->setProperty("name", f.getFileNameWithoutExtension());
  obj->setProperty("file", f.getFileName());
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
  // The standalone app has no DAW to pass keys on to: the page keeps every plain key, or macOS sounds its alert for
  // each one nobody takes (owner, 2026-11-13, CHG-0013).
  obj->setProperty("standalone", proc_.wrapperType == juce::AudioProcessor::wrapperType_Standalone);
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
  if (!dropsRouted_) dropsRouted_ = routeFileDropsToEditor(*this);
  proc_.idleTick();  // a disabled plugin (no audio callbacks): the stage still runs
  // Clicking into the DAW while a computer key is held: the page sees no key-up (owner, Ableton), so end its notes.
  if (const bool keys = windowHasKeys(*this); keys != hadKeys_) {
    hadKeys_ = keys;
    if (!keys) { web_.emitEventIfBrowserIsVisible("bd_keysLost", juce::var(new juce::DynamicObject())); proc_.releasePageKeys(); }
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
  juce::Array<juce::var> particles, pairs, powered, beams, playheads;
  for (int i = 0; i < s->playheadCount * 2; ++i) playheads.add(s->playheads[static_cast<std::size_t>(i)]);
  for (int i = 0; i < s->beamCount * 4; ++i) beams.add(s->beams[static_cast<std::size_t>(i)]);
  for (int i = 0; i < s->particleCount * 3; ++i) particles.add(s->particles[static_cast<std::size_t>(i)]);
  for (int i = 0; i < s->pairCount * 2; ++i) pairs.add(static_cast<int>(s->pairs[static_cast<std::size_t>(i)]));
  for (int i = 0; i < s->poweredCount; ++i) powered.add(static_cast<int>(s->powered[static_cast<std::size_t>(i)]));
  auto* obj = new juce::DynamicObject();
  obj->setProperty("particles", particles);
  obj->setProperty("connections", pairs);
  obj->setProperty("powered", powered);
  obj->setProperty("beams", beams);
  obj->setProperty("playheads", playheads);
  web_.emitEventIfBrowserIsVisible("bd_snapshot", juce::var(obj));
}

}  // namespace blokdust::plugin
