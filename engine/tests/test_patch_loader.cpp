// The patch loader (SPEC-PATCH-FORMAT-V2): what a patch file or shared link can make the engine
// build.
#include <catch2/catch_test_macros.hpp>
#include <memory>
#include <string>

#include <nlohmann/json.hpp>

#include "blokdust/patch_loader.hpp"

using namespace blokdust;

TEST_CASE(
    "PATCH-V2 R7: a Stage listed twice in macros gets one inner world, the first entry's (security "
    "review, PR 13)") {
  // A crafted patch could repeat one Stage's entry many times; each repeat used to build (and keep)
  // a whole Engine.
  nlohmann::json inner1 = nlohmann::json::array({{{"id", "t"},
                                                  {"type", "source.tone"},
                                                  {"x", 0},
                                                  {"y", 0},
                                                  {"params", nlohmann::json::object()}}});
  nlohmann::json inner2 = nlohmann::json::array({{{"id", "p"},
                                                  {"type", "power.power"},
                                                  {"x", 0},
                                                  {"y", 0},
                                                  {"params", nlohmann::json::object()}},
                                                 {{"id", "q"},
                                                  {"type", "power.power"},
                                                  {"x", 3},
                                                  {"y", 0},
                                                  {"params", nlohmann::json::object()}}});
  nlohmann::json patch = {
      {"format", "blokdust.patch"},
      {"version", 2},
      {"seed", 1},
      {"blocks", nlohmann::json::array({{{"id", "s"},
                                         {"type", "source.stage"},
                                         {"x", 0},
                                         {"y", 0},
                                         {"params", nlohmann::json::object()}}})},
      {"macros", nlohmann::json::array()},
  };
  patch["macros"].push_back({{"block", "s"}, {"blocks", inner1}});
  for (int i = 0; i < 50; ++i)
    patch["macros"].push_back({{"block", "s"}, {"blocks", inner2}});

  patch::Loaded loaded;
  std::string err;
  REQUIRE(patch::load(patch, loaded, err));
  REQUIRE(loaded.stages.size() == 1);
  CHECK(loaded.stages[0].second->ids.count("t") == 1);
  CHECK(loaded.stages[0].second->ids.count("p") == 0);

  EngineConfig cfg;
  cfg.sampleRate = 48000;
  cfg.seed = 1;
  auto root = std::make_unique<Engine>(cfg);  // too big for the stack
  for (const auto& c : loaded.commands)
    root->push(c);
  const auto made = patch::attachStages(*root, loaded, 48000);
  CHECK(made.size() == 1);
}

TEST_CASE(
    "PATCH-V2 R3: an unknown param is dropped with a warning, the rest of the patch loads (owner, "
    "iPad 2026-11-19)") {
  // A patch saved by a newer BlokDust (here: a param this build doesn't have) must still play in an
  // older plugin; refusing it left the plugin with an empty world while the page showed the blocks.
  const nlohmann::json patch = {{"format", "blokdust.patch"},
                                {"version", 2},
                                {"seed", 1},
                                {"blocks",
                                 {{{"id", "t"},
                                   {"type", "source.tone"},
                                   {"x", 0},
                                   {"y", 0},
                                   {"params", {{"fromTheFuture", 3}, {"transpose", 7}}}},
                                  {{"id", "p"}, {"type", "power.power"}, {"x", -3}, {"y", 0}}}}};
  blokdust::patch::Loaded loaded;
  std::string err;
  REQUIRE(blokdust::patch::load(patch, loaded, err));
  CHECK(loaded.ids.size() == 2);
  REQUIRE(loaded.warnings.size() == 1);
  CHECK(loaded.warnings[0].find("fromTheFuture") != std::string::npos);
  bool transposed = false;
  for (const auto& c : loaded.commands)
    if (c.type == blokdust::Command::Type::SetParam && c.value == 7.0)
      transposed = true;
  CHECK(transposed);
}
