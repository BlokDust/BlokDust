// Flat C API for the WebAssembly build (ARCHITECTURE-0004). Built as standalone wasm (no Emscripten
// JS glue) so the same binary instantiates in Node, the main thread and an AudioWorkletGlobalScope.
#include <cstdint>
#include <map>
#include <memory>
#include <new>

#include "blokdust/engine.hpp"
#include "blokdust/test_signal.hpp"

using namespace blokdust;

#define BD_EXPORT(name) extern "C" __attribute__((export_name(#name), used))

namespace {
constexpr int kMaxFrames = 4096;
struct Host {
  explicit Host(int sr, std::uint64_t seed) : engine(EngineConfig{sr, seed}) {}
  Engine engine;
  float left[kMaxFrames]{};
  float right[kMaxFrames]{};
  float particles[kMaxParticles * 3]{};
  std::uint32_t pairs[kMaxBlocks * 16]{};
  std::uint32_t powered[kMaxBlocks]{};
  float inLeft[kMaxFrames]{};
  float inRight[kMaxFrames]{};
  float beams[kMaxBeams * 4]{};  // a laser through Prisms casts several (CHG-0015)
  std::uint32_t beamIds[kMaxBeams]{};
  Engine::Playhead playheads[64]{};
  float playheadsOut[128]{};
  Engine::Monitor monitors[64]{};
  float monitorsOut[64 * 5]{};
  // Stage blocks' inner worlds (CHG-0021) by block id, and the one the UI is looking at (0: the
  // outer world).
  std::map<std::uint32_t, std::unique_ptr<Engine>> children;
  std::uint32_t view = 0;
  int sampleRate = 48000;
  std::uint64_t seed = 1;
};

/// The inner world of Stage block `stage`, made and attached on first use. A block that was removed
/// and added again gets a fresh one; worlds whose block is gone are freed here (never while the
/// engine still points at them).
Engine* child(Host* h, std::uint32_t stage) {
  h->engine.prime();  // pending adds and removes apply first, so the block exists and stale
                      // attachments are gone
  for (auto it = h->children.begin(); it != h->children.end();) {
    if (h->engine.stage(it->first) != it->second.get())
      it = h->children.erase(it);
    else
      ++it;
  }
  const auto found = h->children.find(stage);
  if (found != h->children.end())
    return found->second.get();
  EngineConfig cfg;
  cfg.sampleRate = h->sampleRate;
  cfg.seed = h->seed;
  cfg.child = true;
  cfg.parent = &h->engine;
  auto made = std::make_unique<Engine>(cfg);
  if (!h->engine.attachStage(stage, made.get()))
    return nullptr;
  return (h->children[stage] = std::move(made)).get();
}
/// The world snapshots are taken from: the viewed Stage's, or the outer one.
Engine& viewed(Host* h) {
  if (h->view != 0) {
    const auto it = h->children.find(h->view);
    if (it != h->children.end() && h->engine.stage(h->view) == it->second.get())
      return *it->second;
  }
  return h->engine;
}
}  // namespace

BD_EXPORT(bd_create) Host* bd_create(int sampleRate, std::uint32_t seedLo, std::uint32_t seedHi) {
  auto* h = new Host(sampleRate, (std::uint64_t{seedHi} << 32) | seedLo);
  h->sampleRate = sampleRate;
  h->seed = (std::uint64_t{seedHi} << 32) | seedLo;
  return h;
}
BD_EXPORT(bd_destroy) void bd_destroy(Host* h) {
  delete h;
}

/// Push a command. Returns 1 on success, 0 if the queue is full.
BD_EXPORT(bd_push)
int bd_push(Host* h, int type, std::uint32_t id, int blockType, double x, double y, int param,
            double value, double atSample) {
  Command c;
  c.type = static_cast<Command::Type>(type);
  c.id = id;
  c.blockType = static_cast<BlockType>(blockType);
  c.x = x;
  c.y = y;
  c.param = static_cast<std::uint8_t>(param);
  c.value = value;
  c.atSample = static_cast<std::int64_t>(atSample);
  return h->engine.push(c) ? 1 : 0;
}

/// Push a command into the inner world of Stage block `stage` (CHG-0021). Returns 0 if there is no
/// such Stage block (or the queue is full).
BD_EXPORT(bd_push_stage)
int bd_push_stage(Host* h, std::uint32_t stage, int type, std::uint32_t id, int blockType, double x,
                  double y, int param, double value, double atSample) {
  Engine* e = child(h, stage);
  if (!e)
    return 0;
  Command c;
  c.type = static_cast<Command::Type>(type);
  c.id = id;
  c.blockType = static_cast<BlockType>(blockType);
  c.x = x;
  c.y = y;
  c.param = static_cast<std::uint8_t>(param);
  c.value = value;
  c.atSample = static_cast<std::int64_t>(atSample);
  return e->push(c) ? 1 : 0;
}
/// Which world the snapshot functions below read: Stage block `stage`'s inner world, or 0 for the
/// outer one.
BD_EXPORT(bd_view) void bd_view(Host* h, std::uint32_t stage) {
  h->view = stage;
  if (stage)
    child(h, stage);
}

BD_EXPORT(bd_process) void bd_process(Host* h, int frames) {
  if (frames > kMaxFrames)
    frames = kMaxFrames;
  h->engine.process(h->left, h->right, static_cast<std::uint32_t>(frames));
}
/// Same with input audio for source.audio-in: fill bd_input_left/right (or bd_fill_test_sine)
/// first.
BD_EXPORT(bd_process_input) void bd_process_input(Host* h, int frames) {
  if (frames > kMaxFrames)
    frames = kMaxFrames;
  h->engine.process(h->inLeft, h->inRight, h->left, h->right, static_cast<std::uint32_t>(frames));
}
BD_EXPORT(bd_input_left) float* bd_input_left(Host* h) {
  return h->inLeft;
}
BD_EXPORT(bd_input_right) float* bd_input_right(Host* h) {
  return h->inRight;
}
/// Golden-fixture input (blokdust/test_signal.hpp), so WASM feeds exactly the samples the native
/// CLI does.
BD_EXPORT(bd_fill_test_sine)
void bd_fill_test_sine(Host* h, double startSample, int frames, int sampleRate, double frequency,
                       double gain) {
  for (int i = 0; i < frames && i < kMaxFrames; ++i)
    h->inLeft[i] = h->inRight[i] =
        testsignal::sine(static_cast<std::int64_t>(startSample) + i, sampleRate, frequency, gain);
}
BD_EXPORT(bd_left) float* bd_left(Host* h) {
  return h->left;
}
BD_EXPORT(bd_right) float* bd_right(Host* h) {
  return h->right;
}
BD_EXPORT(bd_max_frames) int bd_max_frames() {
  return kMaxFrames;
}

// ---- events: read then clear (field: 0 sample, 1 tick, 2 type, 3 block, 4 other) ----
BD_EXPORT(bd_event_count) int bd_event_count(Host* h) {
  return static_cast<int>(h->engine.events().size());
}
BD_EXPORT(bd_event_field) double bd_event_field(Host* h, int i, int field) {
  const auto& e = h->engine.events()[static_cast<std::size_t>(i)];
  switch (field) {
    case 0:
      return static_cast<double>(e.sample);
    case 1:
      return e.tick;
    case 2:
      return static_cast<double>(e.type);
    case 3:
      return e.block;
    default:
      return e.other;
  }
}
BD_EXPORT(bd_clear_events) void bd_clear_events(Host* h) {
  h->engine.clearEvents();
}

// ---- snapshots for the UI ----
/// Packs particles as [x, y, size] * n (grid units) and returns n.
BD_EXPORT(bd_pack_particles) int bd_pack_particles(Host* h) {
  int n = 0;
  for (const auto& p : viewed(h).particles()) {
    h->particles[n * 3] = static_cast<float>(p.x);
    h->particles[n * 3 + 1] = static_cast<float>(p.y);
    h->particles[n * 3 + 2] = p.size;
    ++n;
  }
  return n;
}
BD_EXPORT(bd_particles) float* bd_particles(Host* h) {
  return h->particles;
}
/// Packs connected block-id pairs [a, b] (a < b in creation order) and returns the pair count.
BD_EXPORT(bd_pack_connections) int bd_pack_connections(Host* h) {
  return viewed(h).connections(h->pairs, kMaxBlocks * 8);  // oldest connection first (R4a)
}
BD_EXPORT(bd_pairs) std::uint32_t* bd_pairs(Host* h) {
  return h->pairs;
}
/// Packs ids of blocks with power > 0 (sources incl. emitters/lasers; drives v1's thick connection
/// lines). Returns n.
BD_EXPORT(bd_pack_powered) int bd_pack_powered(Host* h) {
  int n = 0;
  for (const auto& b : viewed(h).blocks())
    if (b.alive && b.power() > 0)
      h->powered[n++] = b.id;
  return n;
}
BD_EXPORT(bd_powered) std::uint32_t* bd_powered(Host* h) {
  return h->powered;
}
/// Packs laser beams [x0, y0, x1, y1]* (grid units) and returns the count.
BD_EXPORT(bd_pack_beams) int bd_pack_beams(Host* h) {
  int n = 0;
  for (const auto& b : viewed(h).beams()) {
    h->beams[n * 4] = static_cast<float>(b.x0);
    h->beams[n * 4 + 1] = static_cast<float>(b.y0);
    h->beams[n * 4 + 2] = static_cast<float>(b.x1);
    h->beams[n * 4 + 3] = static_cast<float>(b.y1);
    h->beamIds[n] = b.laser;
    ++n;
  }
  return n;
}
BD_EXPORT(bd_beams) float* bd_beams(Host* h) {
  return h->beams;
}
/// Packs sampler playheads [blockId, seconds]* (the open panel's playback lines, owner) and returns
/// the count.
BD_EXPORT(bd_pack_playheads) int bd_pack_playheads(Host* h) {
  const int n = viewed(h).playheads(h->playheads, 64);
  for (int i = 0; i < n; ++i) {
    h->playheadsOut[i * 2] = static_cast<float>(h->playheads[i].block);
    h->playheadsOut[i * 2 + 1] = h->playheads[i].seconds;
  }
  return n;
}
BD_EXPORT(bd_playheads) float* bd_playheads(Host* h) {
  return h->playheadsOut;
}
/// Packs live readouts for open panels [blockId, v0, v1, v2, v3]* (Engine::monitors) and returns
/// the count.
BD_EXPORT(bd_pack_monitors) int bd_pack_monitors(Host* h) {
  const int n = viewed(h).monitors(h->monitors, 64);
  for (int i = 0; i < n; ++i) {
    h->monitorsOut[i * 5] = static_cast<float>(h->monitors[i].block);
    for (int k = 0; k < 4; ++k)
      h->monitorsOut[i * 5 + 1 + k] = h->monitors[i].v[k];
  }
  return n;
}
BD_EXPORT(bd_monitors) float* bd_monitors(Host* h) {
  return h->monitorsOut;
}
/// 1 if an audio source is currently gated on (powered).
BD_EXPORT(bd_block_gate) int bd_block_gate(Host* h, std::uint32_t id) {
  const Block* b = viewed(h).block(id);
  return b && b->gated() ? 1 : 0;
}
/// A block's current param value (0 if no such block or param): the UI reads state the engine
/// changes itself, e.g. a Toggle's on/off after a particle hit (CHG-0013), so a saved or shared
/// patch keeps it, as v1's did.
BD_EXPORT(bd_block_param) double bd_block_param(Host* h, std::uint32_t id, int param) {
  const Block* b = viewed(h).block(id);
  return b && param >= 0 && static_cast<std::size_t>(param) < b->params.size()
             ? b->params[static_cast<std::size_t>(param)]
             : 0.0;
}

// Samples (CHG-0002 1.7): the host allocates buffers in WASM memory (bd_alloc), copies decoded
// audio in, attaches them. fx.convolver's built-in impulse response, for the options panel's
// waveform (no engine needed).
BD_EXPORT(bd_default_impulse)
void bd_default_impulse(float* left, float* right, int frames, int sampleRate) {
  blokdust::dsp::makeDefaultImpulse(left, right, frames, sampleRate);
}
// source.wavetable (CHG-0031, SPEC-AUDIO-WAVETABLE R7): the frame at `position` of `table`, `n`
// points over `cycles` table cycles, for the options panel's picture (no engine needed).
BD_EXPORT(bd_table_picture)
void bd_table_picture(float* out, int table, double position, int n, double cycles) {
  const auto v = blokdust::dsp::TableBank::picture(table, position, n, cycles);
  for (std::size_t i = 0; i < v.size(); ++i)
    out[i] = v[i];
}
/// A table's period (note cycles per table cycle): the panel shows two note cycles of an inharmonic
/// table.
BD_EXPORT(bd_table_period) int bd_table_period(int table) {
  return blokdust::dsp::TableBank::period(table);
}
BD_EXPORT(bd_alloc) float* bd_alloc(std::uint32_t floats) {
  return new (std::nothrow) float[floats];
}
BD_EXPORT(bd_free) void bd_free(float* p) {
  delete[] p;
}
BD_EXPORT(bd_attach_sample)
int bd_attach_sample(Host* h, std::uint32_t id, float* left, float* right, std::uint32_t frames,
                     double sampleRate) {
  return h->engine.attachSample(id, blokdust::SampleBuffer{left, right, frames, sampleRate}) ? 1
                                                                                             : 0;
}
/// The same for a block inside Stage block `stage` (CHG-0021): its inner world's blocks exist once
/// its commands apply.
BD_EXPORT(bd_attach_sample_stage)
int bd_attach_sample_stage(Host* h, std::uint32_t stage, std::uint32_t id, float* left,
                           float* right, std::uint32_t frames, double sampleRate) {
  Engine* e = child(h, stage);
  if (!e)
    return 0;
  e->prime();
  return e->attachSample(id, blokdust::SampleBuffer{left, right, frames, sampleRate}) ? 1 : 0;
}
