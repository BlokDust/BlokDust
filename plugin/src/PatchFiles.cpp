#include "PatchFiles.h"

namespace blokdust::plugin::patchfiles {

juce::File folder() {
  auto dir = juce::File::getSpecialLocation(juce::File::userMusicDirectory).getChildFile("BlokDust").getChildFile("Patches");
  dir.createDirectory();
  return dir;
}

nlohmann::json list(const juce::File& dir) {
  auto files = dir.findChildFiles(juce::File::findFiles, false, "*.blokdust");
  std::sort(files.begin(), files.end(), [](const juce::File& a, const juce::File& b) { return a.getLastModificationTime() > b.getLastModificationTime(); });
  auto out = nlohmann::json::array();
  for (const auto& f : files) {
    juce::String name = f.getFileNameWithoutExtension();
    // The title inside the file wins (it keeps characters a file name can't).
    try {
      const auto j = nlohmann::json::parse(f.loadFileAsString().toStdString());
      if (j.contains("meta") && j["meta"].is_object() && j["meta"].value("title", std::string{}).size()) name = juce::String(j["meta"]["title"].get<std::string>());
    } catch (...) {}
    out.push_back({{"name", name.toStdString()}, {"path", f.getFullPathName().toStdString()}, {"modified", f.getLastModificationTime().toMilliseconds()}});
  }
  return out;
}

juce::String safeName(const juce::String& title) {
  auto n = title.removeCharacters("/\\:*?\"<>|").trim();
  while (n.startsWithChar('.')) n = n.substring(1);
  n = n.substring(0, 64).trim();
  return n.isEmpty() ? juce::String("Untitled") : n;
}

juce::File save(const juce::File& dir, const juce::String& title, nlohmann::json patch) {
  return saveTo(dir.getChildFile(safeName(title) + ".blokdust"), title, std::move(patch));
}

juce::File saveTo(const juce::File& file, const juce::String& title, nlohmann::json patch) {
  patch.erase("plugin");
  if (!patch.contains("meta") || !patch["meta"].is_object()) patch["meta"] = nlohmann::json::object();
  patch["meta"]["title"] = title.toStdString();
  const auto f = file.hasFileExtension("blokdust") ? file : file.withFileExtension("blokdust");
  return f.replaceWithText(juce::String(patch.dump(2))) ? f : juce::File{};
}

nlohmann::json merge(const nlohmann::json& current, const nlohmann::json& part, bool open) {
  auto out = current.is_object() ? current : nlohmann::json::object();
  const auto blocks = part.value("blocks", nlohmann::json::array());
  const auto refs = part.value("refs", nlohmann::json::object());
  if (open) {
    out["blocks"] = blocks;
    out["refs"] = refs;
    out.erase("automation");
    if (part.contains("tempo")) out["tempo"] = part["tempo"]; else out.erase("tempo");
    // R4a: the opened patch's effect order. (Insert keeps the scene's; the inserted blocks' pairs, unlisted, connect
    // in block order when the engine is rebuilt, and the editor then reports the whole order back.)
    if (part.contains("connectionOrder")) out["connectionOrder"] = part["connectionOrder"]; else out.erase("connectionOrder");
    if (part.contains("view")) out["view"] = part["view"]; else out.erase("view");  // the opened patch's view
    if (part.contains("labels")) out["labels"] = part["labels"]; else out.erase("labels");  // and its labels (CHG-0020)
  } else {
    if (!out.contains("blocks") || !out["blocks"].is_array()) out["blocks"] = nlohmann::json::array();
    for (const auto& b : blocks) out["blocks"].push_back(b);
    if (!out.contains("refs") || !out["refs"].is_object()) out["refs"] = nlohmann::json::object();
    for (auto it = refs.begin(); it != refs.end(); ++it) if (!out["refs"].contains(it.key())) out["refs"][it.key()] = it.value();
    if (part.contains("labels") && part["labels"].is_array()) {  // inserted labels join the scene's
      if (!out.contains("labels") || !out["labels"].is_array()) out["labels"] = nlohmann::json::array();
      for (const auto& l : part["labels"]) out["labels"].push_back(l);
    }
  }
  if (out.contains("refs") && out["refs"].empty()) out.erase("refs");
  return out;
}

}  // namespace blokdust::plugin::patchfiles
