// What the editor sends its page (PLUGIN-0001): the processor's patch with the engine's block ids,
// patch files opened or inserted, samples' state, the plugin's account and the values the page asks
// for by name.
#include "AccountStore.h"
#include "PluginEditor.h"
#include "Telemetry.h"

namespace blokdust::plugin {

void BlokDustEditor::sendSampleInfo(const nlohmann::json& s) {
  web_.emitEventIfBrowserIsVisible("bd_sampleInfo", juce::JSON::parse(juce::String(s.dump())));
}

void BlokDustEditor::sendPatchFile(const juce::File& file, const juce::String& mode, int req) {
  if (!file.existsAsFile())
    return;
  sendPatchText(file.loadFileAsString(), file.getFileNameWithoutExtension(), file.getFileName(),
                mode, req);
}

void BlokDustEditor::sendPatchText(const juce::String& text, const juce::String& name,
                                   const juce::String& file, const juce::String& mode, int req) {
  auto* obj = new juce::DynamicObject();
  if (req >= 0)
    obj->setProperty("req", req);
  obj->setProperty("text", text);
  obj->setProperty("name", name);
  obj->setProperty("file", file);
  obj->setProperty("mode", mode);
  web_.emitEventIfBrowserIsVisible("bd_patchFile", juce::var(obj));
}

void BlokDustEditor::reloadPatch() {
  auto* obj = new juce::DynamicObject();
  obj->setProperty("patch", juce::String(proc_.patchJson()));
  // The engine's id for each patch block: the page must use them (the engine outlives the editor;
  // once blocks were deleted its ids are not 1..N, and connections, moves and params would name the
  // wrong blocks; owner, Ableton).
  auto* ids = new juce::DynamicObject();
  for (const auto& [id, key] : proc_.blockIds())
    ids->setProperty(juce::Identifier(juce::String(key)), static_cast<int>(id));
  obj->setProperty("ids", juce::var(ids));
  obj->setProperty("innerIds",
                   juce::JSON::parse(juce::String(
                       proc_.innerIds().dump())));  // each Stage's inner blocks (CHG-0038)
  // The standalone app has no DAW to pass keys on to: the page keeps every plain key, or macOS
  // sounds its alert for each one nobody takes (owner, 2026-11-13, CHG-0013).
  obj->setProperty("standalone", proc_.wrapperType == juce::AudioProcessor::wrapperType_Standalone);
#if JUCE_IOS
  obj->setProperty("ios", true);  // no Trash, no Finder (CHG-0025)
#endif
  obj->setProperty("powerMode", proc_.powerMode());
  obj->setProperty("hostPlaying", proc_.hostIsPlaying());
  auto* system = new juce::DynamicObject();
  system->setProperty("surface",
                      juce::JUCEApplicationBase::isStandaloneApp() ? "standalone" : "plugin");
  system->setProperty("os", juce::SystemStats::getOperatingSystemName());
  system->setProperty("host", juce::PluginHostType().getHostDescription());
  system->setProperty("format", juce::AudioProcessor::getWrapperTypeDescription(proc_.wrapperType));
  system->setProperty("sampleRate", proc_.getSampleRate());
  system->setProperty("bufferSize", proc_.getBlockSize());
  web_.emitEventIfBrowserIsVisible("bd_supportSystem", juce::var(system));
  web_.emitEventIfBrowserIsVisible("bd_patch", juce::var(obj));
}

void BlokDustEditor::sendAccount() {
  const bool standalone = proc_.wrapperType == juce::AudioProcessor::wrapperType_Standalone;
  auto j = account::read();
  j["name"] = account::deviceName(standalone).toStdString();
#if JUCE_IOS
  j["browser"] = standalone;
#if BLOKDUST_NATIVE_SIGN_IN
  j["native"] = standalone;  // Sign in with Apple and passkeys: the app's own (in a host they'd be
                             // the host's)
#endif
#else
  j["browser"] = true;
#endif
  web_.emitEventIfBrowserIsVisible("bd_account", juce::JSON::parse(juce::String(j.dump())));
}

/** Values the plugin keeps outside the patch, by name (web/src/app/pluginValues.ts PluginValues),
 * for bd_get: the page asks when it starts and on each focus return. Names it doesn't know are left
 * out. */
void BlokDustEditor::sendValues(const juce::var& keys) {
  auto* values = new juce::DynamicObject();
  juce::StringArray sent;
  for (const auto& key : keys.isArray() ? *keys.getArray() : juce::Array<juce::var>{}) {
    if (key == "usageStats")
      values->setProperty("usageStats", telemetry::enabled());  // SHARING-0010 R7
    else
      continue;
    sent.add(key.toString() + "=" + values->getProperty(key.toString()).toString());
  }
  systemLog("values: " + sent.joinIntoString(", "));
  web_.emitEventIfBrowserIsVisible("bd_values", juce::var(values));
}

}  // namespace blokdust::plugin
