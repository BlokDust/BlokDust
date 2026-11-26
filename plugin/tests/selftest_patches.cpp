#include <juce_core/juce_core.h>
#include <nlohmann/json.hpp>

#include <iostream>

#include "PatchFiles.h"

// --selftest-patches (CHG-0005): the plugin's patch files and Open/Insert merge, without a plugin.
// Prints JSON.
int selftestPatches() {
  using namespace blokdust::plugin::patchfiles;
  const auto dir = juce::File::createTempFile("bd-patches");
  dir.createDirectory();
  nlohmann::json checks = nlohmann::json::object();
  const nlohmann::json scene = {
      {"format", "blokdust.patch"},
      {"version", 2},
      {"seed", 7},
      {"blocks",
       {{{"id", "a"}, {"type", "source.tone"}, {"x", 0}, {"y", 0}},
        {{"id", "s"},
         {"type", "source.sample"},
         {"x", 3},
         {"y", 0},
         {"params", {{"track", "file:kick.wav"}}}}}},
      {"refs",
       {{"file:kick.wav", {{"provider", "file"}, {"name", "kick.wav"}, {"path", "/x/kick.wav"}}}}},
      {"automation", {{{"slot", 1}, {"block", "a"}, {"param", "fine"}}}},
      {"plugin", {{"dust", {0.5}}}}};
  // save: one file per title, title kept inside, unsafe characters stripped, "plugin" state left
  // out
  const auto f1 = save(dir, "Keys: big/small?", scene);
  const auto f2 = save(dir, "Keys: big/small?", scene);
  const auto j = nlohmann::json::parse(f1.loadFileAsString().toStdString());
  checks["saveName"] = f1.getFileName() == "Keys bigsmall.blokdust" && f1 == f2;
  checks["saveTitle"] =
      j["meta"]["title"] == "Keys: big/small?" && !j.contains("plugin") && j["blocks"].size() == 2;
  save(dir, "Second", scene);
  f1.setLastModificationTime(juce::Time::getCurrentTime() - juce::RelativeTime::hours(1));
  const auto listed = list(dir);
  checks["list"] = listed.size() == 2 && listed[0]["name"] == "Second" &&
                   listed[1]["name"] == "Keys: big/small?";
  // insert: blocks and refs added, the scene's own blocks, refs, automation, seed and plugin state
  // kept
  const nlohmann::json part = {
      {"blocks", {{{"id", "b1"}, {"type", "fx.filter"}, {"x", 9}, {"y", 9}}}},
      {"refs", {{"freesound:1", {{"provider", "freesound"}, {"id", 1}}}}}};
  const auto ins = merge(scene, part, false);
  checks["insert"] = ins["blocks"].size() == 3 && ins["blocks"][2]["id"] == "b1" &&
                     ins["refs"].size() == 2 && ins["automation"].size() == 1 && ins["seed"] == 7 &&
                     ins.contains("plugin");
  // open: blocks, refs and tempo replaced; automation dropped (it named the old blocks)
  auto openPart = part;
  openPart["tempo"] = 96;
  const auto op = merge(scene, openPart, true);
  checks["open"] = op["blocks"].size() == 1 && op["refs"].size() == 1 &&
                   !op.contains("automation") && op["tempo"] == 96 && op["seed"] == 7;
  // SPEC-PATCH-FORMAT-V2 R3b: a field of the wrong type is dropped; the rest of the patch stays
  auto bad = scene;
  bad["blocks"].push_back(42);
  bad["blocks"].push_back({{"id", "t"}, {"type", 7}});
  bad["blocks"][0]["params"] = "junk";
  bad["blocks"][1]["params"]["track"] = 7;
  bad["refs"]["file:x"] = "junk";
  bad["automation"].push_back("junk");
  bad["macros"] = "junk";
  bad["plugin"] = "junk";
  const auto fixed = wellFormed(bad);
  checks["wellFormed"] = fixed["blocks"].size() == 2 && !fixed["blocks"][0].contains("params") &&
                         !fixed["blocks"][1]["params"].contains("track") &&
                         fixed["refs"].size() == 1 && fixed["automation"].size() == 1 &&
                         !fixed.contains("macros") && !fixed.contains("plugin") &&
                         wellFormed(scene) == scene && wellFormed(42).is_null();
  dir.deleteRecursively();
  // saveTo (the save dialog's choice): anywhere, any name ("+" kept), given the .blokdust extension
  const auto elsewhere = juce::File::createTempFile("").getSiblingFile("bd-elsewhere");
  elsewhere.createDirectory();
  const auto f3 = saveTo(elsewhere.getChildFile("Bass + Bells.json"), "Bass + Bells", scene);
  checks["saveTo"] =
      f3.getFileName() == "Bass + Bells.blokdust" &&
      nlohmann::json::parse(f3.loadFileAsString().toStdString())["meta"]["title"] == "Bass + Bells";
  elsewhere.deleteRecursively();
  bool ok = true;
  for (const auto& [name, passed] : checks.items())
    ok = ok && passed.get<bool>();
  std::cout << nlohmann::json{{"selftest", "patches"}, {"ok", ok}, {"checks", checks}}.dump()
            << "\n";
  return ok ? 0 : 1;
}
