#pragma once
// Patch v2 JSON → engine commands (SPEC-PATCH-FORMAT-V2). Used by the render CLI, the plugin and tests.
// The web build has an equivalent TypeScript loader (web/src/patch/loadPatch.ts); golden tests keep them in step.
#include <cstdint>
#include <map>
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
};

/// Append commands that build `patch` (an object with "blocks"). Returns false and sets `err` on invalid input.
bool load(const nlohmann::json& patch, Loaded& out, std::string& err);
/// Append timeline edits: [{atSample, op: add|move|remove|set, block, ...}]. Test/offline-render only.
bool loadScript(const nlohmann::json& script, Loaded& io, std::string& err);

}  // namespace blokdust::patch
