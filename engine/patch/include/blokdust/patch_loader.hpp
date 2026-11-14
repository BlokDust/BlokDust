#pragma once
// Patch v2 JSON → engine commands (SPEC-PATCH-FORMAT-V2). Used by the render CLI, the plugin and tests.
// The web build has an equivalent TypeScript loader (web/src/patch/loadPatch.ts); golden tests keep them in step.
#include <cstdint>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "blokdust/engine.hpp"

namespace blokdust::patch {

struct Loaded {
  std::uint64_t seed = 1;
  std::vector<Command> commands;
  std::map<std::string, BlockId> ids;  // patch block id → engine BlockId (1.., in patch order)
  BlockId nextId = 1;
  /// LFO targets still to resolve (block → "<block id>:<param key>"; AUDIO-0003).
  std::vector<std::pair<BlockId, std::string>> targets;
  /// Stage blocks' inner patches (CHG-0021, SPEC-PATCH-FORMAT-V2 R7): the block, and the commands that build what
  /// is inside it.
  std::vector<std::pair<BlockId, std::shared_ptr<Loaded>>> stages;
};

/// Append commands that build `patch` (an object with "blocks"). Returns false and sets `err` on invalid input.
bool load(const nlohmann::json& patch, Loaded& out, std::string& err);
/// Make the inner worlds of `loaded`'s Stage blocks, fill them and attach them to `root` (which must already hold
/// the patch's commands; they are applied here, as `prime()` does). The caller keeps the returned engines alive for as
/// long as `root` is.
std::vector<std::unique_ptr<Engine>> attachStages(Engine& root, const Loaded& loaded, int sampleRate);
/// Append timeline edits: [{atSample, op: add|move|remove|set, block, ...}]. Test/offline-render only.
bool loadScript(const nlohmann::json& script, Loaded& io, std::string& err);

}  // namespace blokdust::patch
