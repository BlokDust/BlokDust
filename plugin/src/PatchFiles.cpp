#include "PatchFiles.h"

namespace blokdust::plugin::patchfiles {

namespace {
#if JUCE_IOS
juce::File appGroup() {
#if defined(BLOKDUST_APP_GROUP)
  return juce::File::getContainerForSecurityApplicationGroupIdentifier(BLOKDUST_APP_GROUP);
#else
  return {};
#endif
}
#endif

/// Drops `key` from `object` when it is there with a type `ok` refuses.
template <typename Accepts>
void dropUnless(nlohmann::json& object, const char* key, Accepts ok) {
  if (object.contains(key) && !ok(object[key]))
    object.erase(key);
}
bool isString(const nlohmann::json& j) {
  return j.is_string();
}
bool isNumber(const nlohmann::json& j) {
  return j.is_number();
}
bool isObject(const nlohmann::json& j) {
  return j.is_object();
}
bool isArray(const nlohmann::json& j) {
  return j.is_array();
}

/// Keeps the entries of the array at `key` that `keep` accepts (after it fixes them up).
template <typename Keeps>
void filterArray(nlohmann::json& object, const char* key, Keeps keep) {
  dropUnless(object, key, isArray);
  if (!object.contains(key))
    return;
  auto kept = nlohmann::json::array();
  for (auto& entry : object[key])
    if (keep(entry))
      kept.push_back(std::move(entry));
  object[key] = std::move(kept);
}

/// A block needs a string id and type; its params, when there, are an object of the right kinds.
bool wellFormedBlock(nlohmann::json& block) {
  if (!block.is_object() || !block.value("id", nlohmann::json()).is_string() ||
      !block.value("type", nlohmann::json()).is_string())
    return false;
  dropUnless(block, "x", isNumber);
  dropUnless(block, "y", isNumber);
  dropUnless(block, "params", isObject);
  if (block.contains("params"))
    for (const char* key : {"track", "trackName", "user", "permalink"})
      dropUnless(block["params"], key, isString);
  return true;
}
}  // namespace

juce::File root() {
#if JUCE_IOS
  const auto group = appGroup();
  auto dir =
      (group != juce::File{} ? group
                             : juce::File::getSpecialLocation(juce::File::userDocumentsDirectory))
          .getChildFile("BlokDust");
#else
  auto dir =
      juce::File::getSpecialLocation(juce::File::userMusicDirectory).getChildFile("BlokDust");
#endif
  dir.createDirectory();
  return dir;
}

const char* rootKind() {
#if JUCE_IOS
  return appGroup() != juce::File{} ? "app group" : "documents (no app group)";
#else
  return "music folder";
#endif
}

juce::File folder() {
  auto dir = root().getChildFile("Patches");
  dir.createDirectory();
  return dir;
}

bool remove(const juce::File& f) {
#if JUCE_IOS
  return f.deleteFile();
#else
  return f.moveToTrash();
#endif
}

nlohmann::json list(const juce::File& dir) {
  auto files = dir.findChildFiles(juce::File::findFiles, false, "*.blokdust");
  std::sort(files.begin(), files.end(), [](const juce::File& a, const juce::File& b) {
    return a.getLastModificationTime() > b.getLastModificationTime();
  });
  auto out = nlohmann::json::array();
  for (const auto& f : files) {
    juce::String name = f.getFileNameWithoutExtension();
    // The title inside the file wins (it keeps characters a file name can't).
    try {
      const auto j = nlohmann::json::parse(f.loadFileAsString().toStdString());
      if (j.contains("meta") && j["meta"].is_object() &&
          !j["meta"].value("title", std::string{}).empty())
        name = juce::String(j["meta"]["title"].get<std::string>());
    } catch (...) {  // NOLINT(bugprone-empty-catch): not a patch: the file name stays
    }
    out.push_back({{"name", name.toStdString()},
                   {"path", f.getFullPathName().toStdString()},
                   {"modified", f.getLastModificationTime().toMilliseconds()}});
  }
  return out;
}

juce::String safeName(const juce::String& title) {
  auto n = title.removeCharacters("/\\:*?\"<>|").trim();
  while (n.startsWithChar('.'))
    n = n.substring(1);
  n = n.substring(0, 64).trim();
  return n.isEmpty() ? juce::String("Untitled") : n;
}

juce::File save(const juce::File& dir, const juce::String& title, nlohmann::json patch) {
  return saveTo(dir.getChildFile(safeName(title) + ".blokdust"), title, std::move(patch));
}

juce::File saveTo(const juce::File& file, const juce::String& title, nlohmann::json patch) {
  patch.erase("plugin");
  if (!patch.contains("meta") || !patch["meta"].is_object())
    patch["meta"] = nlohmann::json::object();
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
    if (part.contains("tempo"))
      out["tempo"] = part["tempo"];
    else
      out.erase("tempo");
    // R4a: the opened patch's effect order. (Insert keeps the scene's; the inserted blocks' pairs,
    // unlisted, connect in block order when the engine is rebuilt, and the editor then reports the
    // whole order back.)
    if (part.contains("connectionOrder"))
      out["connectionOrder"] = part["connectionOrder"];
    else
      out.erase("connectionOrder");
    if (part.contains("view"))
      out["view"] = part["view"];
    else
      out.erase("view");  // the opened patch's view
    if (part.contains("labels"))
      out["labels"] = part["labels"];
    else
      out.erase("labels");  // and its labels (CHG-0020)
    if (part.contains("macros"))
      out["macros"] = part["macros"];
    else
      out.erase("macros");  // and what is inside its Stage blocks (CHG-0021)
  } else {
    if (!out.contains("blocks") || !out["blocks"].is_array())
      out["blocks"] = nlohmann::json::array();
    for (const auto& b : blocks)
      out["blocks"].push_back(b);
    if (!out.contains("refs") || !out["refs"].is_object())
      out["refs"] = nlohmann::json::object();
    for (auto it = refs.begin(); it != refs.end(); ++it)
      if (!out["refs"].contains(it.key()))
        out["refs"][it.key()] = it.value();
    if (part.contains("labels") && part["labels"].is_array()) {  // inserted labels join the scene's
      if (!out.contains("labels") || !out["labels"].is_array())
        out["labels"] = nlohmann::json::array();
      for (const auto& l : part["labels"])
        out["labels"].push_back(l);
    }
    if (part.contains("macros") && part["macros"].is_array()) {
      if (!out.contains("macros") || !out["macros"].is_array())
        out["macros"] = nlohmann::json::array();
      for (const auto& m : part["macros"])
        out["macros"].push_back(m);
    }
  }
  if (out.contains("refs") && out["refs"].empty())
    out.erase("refs");
  return out;
}

nlohmann::json wellFormed(nlohmann::json patch) {
  if (!patch.is_object())
    return nullptr;
  filterArray(patch, "blocks", wellFormedBlock);
  dropUnless(patch, "refs", isObject);
  if (patch.contains("refs")) {
    auto& refs = patch["refs"];
    for (auto it = refs.begin(); it != refs.end();)
      it = it->is_object() ? std::next(it) : refs.erase(it);
    for (auto& ref : refs) {
      for (const char* key : {"provider", "name", "path", "preview"})
        dropUnless(ref, key, isString);
      dropUnless(ref, "id", isNumber);
    }
  }
  filterArray(patch, "macros", [](nlohmann::json& macro) {
    if (!macro.is_object() || !macro.value("block", nlohmann::json()).is_string())
      return false;
    filterArray(macro, "blocks", wellFormedBlock);
    return true;
  });
  filterArray(patch, "automation", [](nlohmann::json& entry) {
    if (!entry.is_object())
      return false;
    dropUnless(entry, "slot", isNumber);
    dropUnless(entry, "block", isString);
    dropUnless(entry, "param", isString);
    return true;
  });
  dropUnless(patch, "plugin", isObject);
  if (patch.contains("plugin")) {
    dropUnless(patch["plugin"], "dust", isArray);
    dropUnless(patch["plugin"], "powerMode", isNumber);
  }
  return patch;
}

}  // namespace blokdust::plugin::patchfiles
