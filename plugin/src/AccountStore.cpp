#include "AccountStore.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include "PatchFiles.h"

#if JUCE_MAC || JUCE_IOS || JUCE_LINUX
#include <sys/stat.h>
#endif

namespace blokdust::plugin::account {
namespace {
juce::File file() {
#if JUCE_IOS
  // Beside the shared BlokDust folder in the App Group container, not in it (that folder holds the user's files).
  return patchfiles::root().getParentDirectory().getChildFile("account.json");
#else
  return juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory).getChildFile("BlokDust").getChildFile("account.json");
#endif
}
bool validKey(const std::string& k) {
  if (k.size() < 24 || k.size() > 68 || k.rfind("bdk_", 0) != 0) return false;
  for (const char c : k) if (!(std::isalnum(static_cast<unsigned char>(c)) || c == '_' || c == '-')) return false;
  return true;
}
}  // namespace

nlohmann::json read() {
  const auto f = file();
  if (!f.existsAsFile()) return nlohmann::json::object();
  try {
    auto j = nlohmann::json::parse(f.loadFileAsString().toStdString());
    if (j.is_object() && validKey(j.value("key", std::string{}))) return {{"key", j["key"]}, {"handle", j.value("handle", std::string{})}};
  } catch (...) {}
  return nlohmann::json::object();
}

bool write(const std::string& key, const std::string& handle) {
  if (!validKey(key)) return false;
  const auto f = file();
  f.getParentDirectory().createDirectory();
  const auto tmp = f.getSiblingFile("account.json.tmp");
  if (!tmp.replaceWithText(juce::String(nlohmann::json{{"key", key}, {"handle", handle.substr(0, 40)}}.dump()))) return false;
#if JUCE_MAC || JUCE_IOS || JUCE_LINUX
  ::chmod(tmp.getFullPathName().toRawUTF8(), 0600);  // this user only
#endif
  return tmp.moveFileTo(f);
}

void clear() { file().deleteFile(); }

juce::String deviceName(bool standalone) {
#if JUCE_IOS
  const juce::String where = "iPad";
#elif JUCE_MAC
  const juce::String where = "Mac";
#elif JUCE_WINDOWS
  const juce::String where = "Windows";
#else
  const juce::String where = "Linux";
#endif
  const auto host = standalone ? juce::String() : juce::PluginHostType().getHostDescription();
  return "BlokDust on " + where + (host.isNotEmpty() && host != "Unknown" ? " (" + host + ")" : juce::String());
}

}  // namespace blokdust::plugin::account
