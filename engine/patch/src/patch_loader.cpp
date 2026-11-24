#include "blokdust/patch_loader.hpp"

#include <algorithm>

namespace blokdust::patch {

namespace {
bool paramIndex(BlockType t, const std::string& key, std::uint8_t& out) {
  const auto& inf = gen::info(t);
  for (std::uint8_t i = 0; i < inf.paramCount; ++i)
    if (inf.params[i].key == key) {
      out = i;
      return true;
    }
  return false;
}
bool toNumber(const nlohmann::json& v, double& out) {
  if (v.is_number()) {
    out = v.get<double>();
    return true;
  }
  if (v.is_boolean()) {
    out = v.get<bool>() ? 1.0 : 0.0;
    return true;
  }
  return false;  // non-numeric params (e.g. v1 track names) are not engine state
}
bool addBlock(const nlohmann::json& b, Loaded& out, std::int64_t at, std::string& err) {
  if (!b.is_object() || !b.contains("id") || !b.contains("type")) {
    err = "block needs id and type";
    return false;
  }
  const auto key = b["id"].get<std::string>();
  BlockType t{};
  if (!gen::findBlockType(b["type"].get<std::string>(), t)) {
    err = "unknown block type " + b["type"].dump();
    return false;
  }
  if (out.ids.count(key)) {
    err = "duplicate block id " + key;
    return false;
  }
  const BlockId id = out.nextId++;
  out.ids[key] = id;
  out.commands.push_back(Command::add(id, t, b.value("x", 0.0), b.value("y", 0.0), at));
  if (b.contains("params")) {
    for (const auto& [pk, pv] : b["params"].items()) {
      std::uint8_t idx;
      double v;
      // R3: a param this build doesn't know (a newer BlokDust saved it) is dropped with a warning;
      // the rest loads.
      if (!paramIndex(t, pk, idx)) {
        out.warnings.push_back("unknown param " + pk + " on " + key);
        continue;
      }
      // An LFO's target (AUDIO-0003) is saved as "<block id>:<param key>"; the engine ids it
      // becomes are this session's, so saved ones are never read. Resolved once every block is
      // known (resolveTargets).
      if (pk == "targetBlock" || pk == "targetParam")
        continue;
      if (pk == "target") {
        if (pv.is_string())
          out.targets.emplace_back(id, pv.get<std::string>());
        continue;
      }
      if (toNumber(pv, v))
        out.commands.push_back(Command::setParam(id, idx, v, at));
    }
  }
  return true;
}
/// "<block id>:<param key>" → SetParam targetBlock / targetParam on the block that names it.
/// Unknown blocks or params are skipped (the LFO idles).
void resolveTargets(Loaded& out) {
  for (const auto& [id, text] : out.targets) {
    const auto colon = text.rfind(':');
    if (colon == std::string::npos)
      continue;
    const auto it = out.ids.find(text.substr(0, colon));
    if (it == out.ids.end())
      continue;
    BlockType own{}, theirs{};
    for (const auto& c : out.commands)
      if (c.type == Command::Type::AddBlock) {
        if (c.id == id)
          own = c.blockType;
        if (c.id == it->second)
          theirs = c.blockType;
      }
    std::uint8_t tb, tp, idx;
    if (!paramIndex(own, "targetBlock", tb) || !paramIndex(own, "targetParam", tp) ||
        !paramIndex(theirs, text.substr(colon + 1), idx))
      continue;
    out.commands.push_back(Command::setParam(id, tb, static_cast<double>(it->second)));
    out.commands.push_back(Command::setParam(id, tp, static_cast<double>(idx)));
  }
  out.targets.clear();
}
}  // namespace

bool load(const nlohmann::json& patch, Loaded& out, std::string& err) {
  if (!patch.is_object() || !patch.contains("blocks") || !patch["blocks"].is_array()) {
    err = "patch needs a blocks array";
    return false;
  }
  if (patch.contains("version") && patch["version"] != 2) {
    err = "unsupported patch version";
    return false;
  }
  out.seed = patch.value("seed", std::uint64_t{1});
  // The patch's tempo (SIMULATION-0003; the plugin then follows the host's). Only when set, so
  // older patches keep exactly their command list.
  if (patch.contains("tempo") && patch["tempo"].is_number())
    out.commands.push_back(Command::tempo(patch["tempo"].get<double>()));
  for (const auto& b : patch["blocks"])
    if (!addBlock(b, out, -1, err))
      return false;
  resolveTargets(out);
  // R7: `macros` holds what is inside each Stage block: { block: "<stage block id>", blocks: […],
  // connectionOrder? }. One level only (SCOPE-0006): a Stage inside a Stage stays empty.
  if (patch.contains("macros") && patch["macros"].is_array())
    for (const auto& m : patch["macros"]) {
      if (!m.is_object() || !m.contains("block") || !m["block"].is_string() ||
          !m.contains("blocks") || !m["blocks"].is_array())
        continue;
      const auto it = out.ids.find(m["block"].get<std::string>());
      if (it == out.ids.end())
        continue;
      // One inner world per Stage: the first entry wins. Repeats were each built into an Engine of
      // their own (security review, PR 13: a crafted file could exhaust memory).
      // web/src/patch/loadPatch.ts does the same.
      if (std::any_of(out.stages.begin(), out.stages.end(),
                      [&](const auto& s) { return s.first == it->second; }))
        continue;
      auto inner = std::make_shared<Loaded>();
      nlohmann::json body = {{"blocks", m["blocks"]}};
      if (m.contains("connectionOrder"))
        body["connectionOrder"] = m["connectionOrder"];
      if (!load(body, *inner, err))
        return false;
      out.stages.emplace_back(it->second, std::move(inner));
    }
  // R4a: the order the pairs connected in, oldest first (SPEC-PATCH-FORMAT-V2 R4). Unknown or
  // unconnected pairs are skipped (the engine ignores them); without the list, pairs connect in
  // block order.
  if (patch.contains("connectionOrder") && patch["connectionOrder"].is_array())
    for (const auto& p : patch["connectionOrder"]) {
      if (!p.is_array() || p.size() != 2 || !p[0].is_string() || !p[1].is_string())
        continue;
      const auto a = out.ids.find(p[0].get<std::string>()),
                 b = out.ids.find(p[1].get<std::string>());
      if (a != out.ids.end() && b != out.ids.end())
        out.commands.push_back(Command::relink(a->second, b->second));
    }
  return true;
}

std::map<BlockId, std::unique_ptr<Engine>> attachStagesById(Engine& root, const Loaded& loaded,
                                                            int sampleRate) {
  std::map<BlockId, std::unique_ptr<Engine>> made;
  root.prime();
  for (const auto& [block, inner] : loaded.stages) {
    EngineConfig cfg;
    cfg.sampleRate = sampleRate;
    cfg.seed = loaded.seed;
    cfg.child = true;
    cfg.parent = &root;
    auto e = std::make_unique<Engine>(cfg);
    for (const auto& c : inner->commands)
      e->push(c);
    if (root.attachStage(block, e.get()))
      made[block] = std::move(e);
  }
  return made;
}

std::vector<std::unique_ptr<Engine>> attachStages(Engine& root, const Loaded& loaded,
                                                  int sampleRate) {
  std::vector<std::unique_ptr<Engine>> out;
  for (auto& [block, e] : attachStagesById(root, loaded, sampleRate))
    out.push_back(std::move(e));
  return out;
}

bool loadScript(const nlohmann::json& script, Loaded& io, std::string& err) {
  if (!script.is_array()) {
    err = "script must be an array";
    return false;
  }
  for (const auto& s : script) {
    const auto op = s.value("op", std::string{});
    const std::int64_t at = s.value("atSample", std::int64_t{-1});
    if (op == "add") {
      if (!addBlock(s["block"], io, at, err))
        return false;
      continue;
    }
    if (op == "tempo") {
      io.commands.push_back(Command::tempo(s.value("bpm", 120.0), s.value("beat", -1.0), at));
      continue;
    }
    if (op == "noteOn" || op == "noteOff" ||
        op == "expression") {  // to every controller of a type (default: MIDI)
      BlockType t{};
      if (!gen::findBlockType(s.value("controller", std::string("input.midi-controller")), t)) {
        err = "bad controller type";
        return false;
      }
      const auto note = static_cast<std::uint8_t>(s.value("note", 60));
      const int ch =
          s.value("channel", 0);  // MIDI channel 0–15 (MPE: the note's own channel, PLUGIN-0004)
      if (op == "expression") {
        const auto dim = s.value("dim", std::string{});
        const auto x = dim == "bend"       ? Command::Expression::Bend
                       : dim == "pressure" ? Command::Expression::Pressure
                                           : Command::Expression::Slide;
        if (dim != "bend" && dim != "pressure" && dim != "slide") {
          err = "bad expression dim " + dim;
          return false;
        }
        io.commands.push_back(Command::noteExpression(t, note, ch, x, s.value("value", 0.0), at));
      } else
        io.commands.push_back(op == "noteOn"
                                  ? Command::noteOn(t, note, s.value("velocity", 1.0), at, ch)
                                  : Command::noteOff(t, note, at, ch));
      continue;
    }
    const auto key = s.value("block", std::string{});
    const auto it = io.ids.find(key);
    if (it == io.ids.end()) {
      err = "script refers to unknown block " + key;
      return false;
    }
    if (op == "move")
      io.commands.push_back(Command::move(it->second, s.value("x", 0.0), s.value("y", 0.0), at));
    else if (op == "remove")
      io.commands.push_back(Command::remove(it->second, at));
    else if (op == "set") {
      // param index needs the block type: find its AddBlock command
      BlockType t{};
      for (const auto& c : io.commands)
        if (c.type == Command::Type::AddBlock && c.id == it->second)
          t = c.blockType;
      std::uint8_t idx;
      double v;
      if (!paramIndex(t, s.value("param", std::string{}), idx) || !toNumber(s["value"], v)) {
        err = "bad set op for " + key;
        return false;
      }
      io.commands.push_back(Command::setParam(it->second, idx, v, at));
    } else {
      err = "unknown script op " + op;
      return false;
    }
  }
  // The engine queue is FIFO and holds later commands behind earlier ones, so order by due sample
  // (stable: ties keep file order; immediate commands, atSample < 0, stay first).
  std::stable_sort(io.commands.begin(), io.commands.end(), [](const Command& a, const Command& b) {
    return std::max<std::int64_t>(a.atSample, -1) < std::max<std::int64_t>(b.atSample, -1);
  });
  return true;
}

}  // namespace blokdust::patch
