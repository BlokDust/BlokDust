#include "StageWorlds.h"

namespace blokdust::plugin {

void StageWorlds::reset(std::map<BlockId, std::unique_ptr<Engine>> worlds,
                        std::map<BlockId, std::map<BlockId, std::string>> keys) {
  worlds_ = std::move(worlds);
  keys_ = std::move(keys);
  retired_.clear();
}

Engine* StageWorlds::find(BlockId stage) const {
  const auto it = worlds_.find(stage);
  return it == worlds_.end() ? nullptr : it->second.get();
}

Engine* StageWorlds::world(Engine& root, BlockId stage, EngineConfig cfg, const Suspend& suspend) {
  if (auto* engine = find(stage))
    return engine;
  cfg.child = true;
  cfg.parent = &root;
  auto made = std::make_unique<Engine>(cfg);  // allocated here, on the message thread
  suspend(true);
  collect(root);  // the Stage block itself may still be a queued command: applied first
  const bool ok = root.attachStage(stage, made.get());
  suspend(false);
  if (!ok)
    return nullptr;
  keys_[stage].clear();
  return (worlds_[stage] = std::move(made)).get();
}

void StageWorlds::retire(BlockId stage) {
  if (auto it = worlds_.find(stage); it != worlds_.end()) {
    retired_.emplace_back(stage, std::move(it->second));
    worlds_.erase(it);
  }
  keys_.erase(stage);
}

void StageWorlds::collect(Engine& root) {
  root.prime();
  for (auto it = retired_.begin(); it != retired_.end();)
    it = root.stage(it->first) == it->second.get() ? std::next(it) : retired_.erase(it);
}

namespace {
const char* const kOwned[] = {"track", "trackName", "user", "permalink"};
const nlohmann::json* findBlock(const nlohmann::json& macros, const std::string& stage,
                                const std::string& block) {
  if (!macros.is_array())
    return nullptr;
  for (const auto& m : macros)
    if (m.is_object() && m.value("block", std::string{}) == stage && m.contains("blocks") &&
        m["blocks"].is_array())
      for (const auto& b : m["blocks"])
        if (b.is_object() && b.value("id", std::string{}) == block)
          return &b;
  return nullptr;
}
}  // namespace

nlohmann::json mergeMacros(const nlohmann::json& previous, const nlohmann::json& incoming) {
  auto out = incoming.is_array() ? incoming : nlohmann::json::array();
  for (auto& m : out) {
    if (!m.is_object() || !m.contains("blocks") || !m["blocks"].is_array())
      continue;
    const auto stage = m.value("block", std::string{});
    for (auto& b : m["blocks"]) {
      if (!b.is_object())
        continue;
      const auto* was = findBlock(previous, stage, b.value("id", std::string{}));
      if (!was || !was->contains("params") || !(*was)["params"].is_object())
        continue;
      if (!b.contains("params") || !b["params"].is_object())
        b["params"] = nlohmann::json::object();
      for (const char* k : kOwned)
        if ((*was)["params"].contains(k))
          b["params"][k] = (*was)["params"][k];
    }
  }
  return out;
}

}  // namespace blokdust::plugin
