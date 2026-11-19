#pragma once
// Stage blocks' inner worlds in the plugin (CHG-0038, SPEC-SIMULATION-POWER-AND-PARTICLES R13). The processor's engine owns the outer
// world; each Stage block's inner world is a child Engine kept here. Worlds come from the patch when the engine is
// rebuilt, or are made when the page first edits or opens a Stage that has none. Engine::attachStage is for the audio
// thread between process calls, so attaching (and freeing a world the engine let go) happens with the audio callback
// held off. Nothing here runs for a patch without Stage blocks.
#include <functional>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "blokdust/engine.hpp"

namespace blokdust::plugin {

class StageWorlds {
 public:
  /// `suspend(true)` holds the audio callback off until `suspend(false)` (AudioProcessor::suspendProcessing).
  using Suspend = std::function<void(bool)>;

  /// After the engine was rebuilt: the worlds made for it, by Stage block, and each world's blocks' patch ids by
  /// engine id. The previous worlds go (call with the callback held, as the engines swap).
  void reset(std::map<BlockId, std::unique_ptr<Engine>> worlds, std::map<BlockId, std::map<BlockId, std::string>> keys);
  /// Stage block `stage`'s inner world, or nullptr.
  Engine* find(BlockId stage) const;
  /// Message thread: Stage block `stage`'s inner world, made from `cfg` and attached to `root` if it has none.
  /// nullptr if `stage` is not a Stage block of `root` (or no world can be attached).
  Engine* world(Engine& root, BlockId stage, EngineConfig cfg, const Suspend& suspend);
  /// The Stage block is being removed: its world is freed once `root` has let it go (collect).
  void retire(BlockId stage);
  /// With the callback held: apply `root`'s due commands, then free retired worlds it no longer points at.
  void collect(Engine& root);
  /// The patch ids of Stage `stage`'s inner blocks, by engine id.
  std::map<BlockId, std::string>& keys(BlockId stage) { return keys_[stage]; }
  const std::map<BlockId, std::map<BlockId, std::string>>& allKeys() const { return keys_; }
  std::size_t size() const { return worlds_.size(); }
  std::size_t retired() const { return retired_.size(); }

 private:
  std::map<BlockId, std::unique_ptr<Engine>> worlds_;
  std::vector<std::pair<BlockId, std::unique_ptr<Engine>>> retired_;
  std::map<BlockId, std::map<BlockId, std::string>> keys_;
};

/// The page's `incoming` macros, with the sampler fields the processor owns (the sound and its credit: track,
/// trackName, user, permalink) taken from `previous` where it has them: the page learns them only from the
/// processor's sample reports, so a macro it sends may be older than the processor's latest load.
nlohmann::json mergeMacros(const nlohmann::json& previous, const nlohmann::json& incoming);

}  // namespace blokdust::plugin
