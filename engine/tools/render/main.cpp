// blokdust_render — offline, deterministic render of a patch fixture (CHG-0001 task 0.7).
//   blokdust_render <fixture.json> [--wav out.wav] [--events out.jsonl] [--block N]
// Also reports processSeconds (wall time of the process() loop only; the tool may read the clock,
// the engine never does). fixture: { "render": {"seconds", "sampleRate"}, "patch": {...v2
// patch...}, "script": [...] }  (or a bare patch) Prints a JSON summary: hashes (see
// blokdust/hash.hpp) + simple descriptors used by golden tests and MCP validation.
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "blokdust/engine.hpp"
#include "blokdust/hash.hpp"
#include "blokdust/patch_loader.hpp"
#include "blokdust/test_signal.hpp"

using namespace blokdust;

namespace {
std::string hex(std::uint64_t v) {
  char b[17];
  std::snprintf(b, sizeof b, "%016llx", static_cast<unsigned long long>(v));
  return b;
}

void writeWav(const std::string& path, const std::vector<float>& left,
              const std::vector<float>& right, int sr) {
  std::ofstream f(path, std::ios::binary);
  auto u32 = [&](std::uint32_t v) {
    f.write(reinterpret_cast<const char*>(&v), 4);
  };
  auto u16 = [&](std::uint16_t v) {
    f.write(reinterpret_cast<const char*>(&v), 2);
  };
  const std::uint32_t dataBytes = static_cast<std::uint32_t>(left.size() * 2 * sizeof(float));
  f.write("RIFF", 4);
  u32(36 + dataBytes);
  f.write("WAVE", 4);
  f.write("fmt ", 4);
  u32(16);
  u16(3 /*IEEE float*/);
  u16(2);
  u32(static_cast<std::uint32_t>(sr));
  u32(static_cast<std::uint32_t>(sr) * 2 * 4);
  u16(8);
  u16(32);
  f.write("data", 4);
  u32(dataBytes);
  for (std::size_t i = 0; i < left.size(); ++i) {
    f.write(reinterpret_cast<const char*>(&left[i]), 4);
    f.write(reinterpret_cast<const char*>(&right[i]), 4);
  }
}

const char* eventName(Event::Type t) {
  switch (t) {
    case Event::Type::Emit:
      return "emit";
    case Event::Type::Hit:
      return "hit";
    case Event::Type::Absorb:
      return "absorb";
    case Event::Type::Expire:
      return "expire";
    case Event::Type::GateOn:
      return "gateOn";
    case Event::Type::GateOff:
      return "gateOff";
    case Event::Type::Connect:
      return "connect";
    case Event::Type::Disconnect:
      return "disconnect";
    case Event::Type::Logic:
      return "logic";
    case Event::Type::Pass:
      return "pass";
    case Event::Type::Block:
      return "block";
    case Event::Type::Split:
      return "split";
  }
  return "?";
}
}  // namespace

/// Minimal WAV reader for test fixtures: PCM 16-bit or IEEE float 32-bit, mono or stereo.
static bool readWav(const std::string& path, std::vector<float>& left, std::vector<float>& right,
                    double& rate) {
  std::ifstream f(path, std::ios::binary);
  if (!f)
    return false;
  std::vector<char> b((std::istreambuf_iterator<char>(f)), {});
  auto u16 = [&](std::size_t o) {
    return static_cast<unsigned>(static_cast<unsigned char>(b[o]) |
                                 (static_cast<unsigned char>(b[o + 1]) << 8));
  };
  auto u32 = [&](std::size_t o) {
    return u16(o) | (u16(o + 2) << 16);
  };
  if (b.size() < 44 || std::string(b.data(), 4) != "RIFF" || std::string(b.data() + 8, 4) != "WAVE")
    return false;
  unsigned fmt = 0, ch = 0, bits = 0;
  std::size_t o = 12;
  while (o + 8 <= b.size()) {
    const std::string id(b.data() + o, 4);
    const std::size_t len = u32(o + 4);
    if (id == "fmt ") {
      fmt = u16(o + 8);
      ch = u16(o + 10);
      rate = u32(o + 12);
      bits = u16(o + 22);
    } else if (id == "data") {
      const std::size_t frames = len / (ch * bits / 8);
      left.resize(frames);
      if (ch > 1)
        right.resize(frames);
      for (std::size_t i = 0; i < frames; ++i)
        for (unsigned c = 0; c < std::min(ch, 2u); ++c) {
          const std::size_t at = o + 8 + (i * ch + c) * (bits / 8);
          float v = 0;
          if (fmt == 3 && bits == 32) {
            std::uint32_t w = u32(at);
            std::memcpy(&v, &w, 4);
          } else if (fmt == 1 && bits == 16)
            v = static_cast<float>(static_cast<std::int16_t>(u16(at))) / 32768.0f;
          else
            return false;
          (c == 0 ? left : right)[i] = v;
        }
      return ch > 0;
    }
    o += 8 + len + (len & 1);
  }
  return false;
}

// NOLINTNEXTLINE(bugprone-exception-escape): a command-line tool; an exception ends the run
int main(int argc, char** argv) {
  if (argc < 2) {
    std::cerr << "usage: blokdust_render <fixture.json> [--wav out.wav] [--events out.jsonl] "
                 "[--block N]\n";
    return 2;
  }
  std::string wavPath, eventsPath;
  std::int64_t kBlock = 512;
  for (int i = 2; i + 1 < argc; ++i) {
    if (std::string(argv[i]) == "--wav")
      wavPath = argv[++i];
    else if (std::string(argv[i]) == "--events")
      eventsPath = argv[++i];
    else if (std::string(argv[i]) == "--block")
      kBlock = std::max<std::int64_t>(1, std::stoll(argv[++i]));
  }
  nlohmann::json fx;
  try {
    std::ifstream in(argv[1]);
    fx = nlohmann::json::parse(in);
  } catch (const std::exception& error) {
    std::cerr << "error: " << error.what() << "\n";
    return 1;
  }
  const auto& patchJson = fx.contains("patch") ? fx["patch"] : fx;
  const auto render = fx.value("render", nlohmann::json::object());
  const int sr = render.value("sampleRate", 48000);
  const double seconds = render.value("seconds", 5.0);
  const auto frames = static_cast<std::int64_t>(std::llround(seconds * sr));

  patch::Loaded loaded;
  std::string err;
  if (!patch::load(patchJson, loaded, err) ||
      (fx.contains("script") && !patch::loadScript(fx["script"], loaded, err))) {
    std::cerr << "error: " << err << "\n";
    return 1;
  }
  auto engine = std::make_unique<Engine>(EngineConfig{sr, loaded.seed});
  for (const auto& c : loaded.commands)
    if (!engine->push(c)) {
      std::cerr << "error: command queue full\n";
      return 1;
    }
  const auto stages = patch::attachStages(
      *engine, loaded, sr);  // Stage blocks' inner worlds (CHG-0021), alive with the engine
  // Optional samples: "samples": [{"block": "<patch id>", "wav": "<path>"}] (float32 or 16-bit PCM
  // WAV). Attached before the first block, as the plugin does once it has loaded a patch's files
  // (CHG-0004 3.6).
  std::vector<std::vector<float>> sampleData;
  if (fx.contains("samples")) {
    engine->prime();
    for (const auto& s : fx["samples"]) {
      std::vector<float> l, r;
      double rate = 0;
      if (!readWav(s.value("wav", std::string{}), l, r, rate)) {
        std::cerr << "error: cannot read " << s.value("wav", std::string{}) << "\n";
        return 1;
      }
      // "stage": "<Stage block's patch id>": the block is inside that Stage (CHG-0038), attached to
      // its inner world.
      Engine* world = engine.get();
      const std::map<std::string, BlockId>* ids = &loaded.ids;
      if (const auto st = s.value("stage", std::string{}); !st.empty()) {
        const auto sid = loaded.ids.find(st);
        world = sid == loaded.ids.end() ? nullptr : engine->stage(sid->second);
        for (const auto& [b, inner] : loaded.stages)
          if (sid != loaded.ids.end() && b == sid->second)
            ids = &inner->ids;
        if (!world || ids == &loaded.ids) {
          std::cerr << "error: no Stage " << st << " with a world\n";
          return 1;
        }
        world->prime();
      }
      const auto it = ids->find(s.value("block", std::string{}));
      if (it == ids->end()) {
        std::cerr << "error: no block " << s.value("block", std::string{}) << "\n";
        return 1;
      }
      const bool stereo = !r.empty();
      const auto sampleFrames = static_cast<std::uint32_t>(l.size());
      sampleData.reserve(sampleData.size() + 2);  // pointers below must stay valid
      sampleData.push_back(std::move(l));
      if (stereo)
        sampleData.push_back(std::move(r));
      const float* L = sampleData[sampleData.size() - (stereo ? 2 : 1)].data();
      const float* R = stereo ? sampleData.back().data() : nullptr;
      if (!world->attachSample(it->second, SampleBuffer{L, R, sampleFrames, rate})) {
        std::cerr << "error: attach failed for " << it->first << "\n";
        return 1;
      }
    }
  }

  std::vector<float> left(static_cast<std::size_t>(frames)),
      right(static_cast<std::size_t>(frames));
  // Optional deterministic input for Audio In: {"type":"sine","frequency":f,"gain":g}
  // (blokdust/test_signal.hpp).
  const auto in = fx.value("input", nlohmann::json());
  std::vector<float> input;
  if (in.is_object()) {
    input.resize(static_cast<std::size_t>(frames));
    for (std::int64_t i = 0; i < frames; ++i)
      input[static_cast<std::size_t>(i)] =
          testsignal::sine(i, sr, in.value("frequency", 440.0), in.value("gain", 0.25));
  }
  const auto t0 = std::chrono::steady_clock::now();
  for (std::int64_t done = 0; done < frames; done += kBlock) {
    const auto n = static_cast<std::uint32_t>(std::min(kBlock, frames - done));
    const float* src = input.empty() ? nullptr : input.data() + done;
    engine->process(src, src, left.data() + done, right.data() + done, n);
  }

  const double processSeconds =
      std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
  double sumSq = 0, peak = 0;
  std::int64_t zc = 0;
  for (std::size_t i = 0; i < left.size(); ++i) {
    sumSq += double(left[i]) * left[i];
    peak = std::max(peak, double(std::abs(left[i])));
    if (i && (left[i - 1] < 0.0f) != (left[i] < 0.0f))
      ++zc;
  }
  std::map<std::string, int> counts;
  for (const auto& ev : engine->events())
    counts[eventName(ev.type)]++;

  nlohmann::json summary = {
      {"audioHash", hex(hash::stereo(hash::audio(left), hash::audio(right)))},
      {"eventHash", hex(hash::events(engine->events()))},
      {"sampleRate", sr},
      {"frames", frames},
      {"eventCount", engine->events().size()},
      {"events", counts},
      {"rms", std::sqrt(sumSq / double(std::max<std::int64_t>(frames, 1)))},
      {"peak", peak},
      {"zeroCrossingsPerSecond", double(zc) / seconds},
      {"droppedEvents", engine->droppedEvents()},
      {"processSeconds", processSeconds},
      {"block", kBlock},
  };
  if (!wavPath.empty())
    writeWav(wavPath, left, right, sr);
  if (!eventsPath.empty()) {
    std::ofstream f(eventsPath);
    for (const auto& ev : engine->events())
      f << nlohmann::json{{"sample", ev.sample},
                          {"tick", ev.tick},
                          {"type", eventName(ev.type)},
                          {"block", ev.block},
                          {"other", ev.other}}
               .dump()
        << "\n";
  }
  std::cout << summary.dump() << "\n";
  return 0;
}
