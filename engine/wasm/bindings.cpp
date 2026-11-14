// Flat C API for the WebAssembly build (ARCHITECTURE-0004). Built as standalone wasm (no Emscripten JS glue) so the
// same binary instantiates in Node, the main thread and an AudioWorkletGlobalScope.
#include <new>
#include <cstdint>
#include <memory>

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
  float beams[kMaxBlocks * 4]{};
  std::uint32_t beamIds[kMaxBlocks]{};
  Engine::Playhead playheads[64]{};
  float playheadsOut[128]{};
};
}  // namespace

BD_EXPORT(bd_create) Host* bd_create(int sampleRate, std::uint32_t seedLo, std::uint32_t seedHi) {
  return new Host(sampleRate, (std::uint64_t{seedHi} << 32) | seedLo);
}
BD_EXPORT(bd_destroy) void bd_destroy(Host* h) { delete h; }

/// Push a command. Returns 1 on success, 0 if the queue is full.
BD_EXPORT(bd_push) int bd_push(Host* h, int type, std::uint32_t id, int blockType, double x, double y, int param, double value, double atSample) {
  Command c;
  c.type = static_cast<Command::Type>(type);
  c.id = id; c.blockType = static_cast<BlockType>(blockType);
  c.x = x; c.y = y; c.param = static_cast<std::uint8_t>(param); c.value = value;
  c.atSample = static_cast<std::int64_t>(atSample);
  return h->engine.push(c) ? 1 : 0;
}

BD_EXPORT(bd_process) void bd_process(Host* h, int frames) {
  if (frames > kMaxFrames) frames = kMaxFrames;
  h->engine.process(h->left, h->right, static_cast<std::uint32_t>(frames));
}
/// Same with input audio for source.audio-in: fill bd_input_left/right (or bd_fill_test_sine) first.
BD_EXPORT(bd_process_input) void bd_process_input(Host* h, int frames) {
  if (frames > kMaxFrames) frames = kMaxFrames;
  h->engine.process(h->inLeft, h->inRight, h->left, h->right, static_cast<std::uint32_t>(frames));
}
BD_EXPORT(bd_input_left) float* bd_input_left(Host* h) { return h->inLeft; }
BD_EXPORT(bd_input_right) float* bd_input_right(Host* h) { return h->inRight; }
/// Golden-fixture input (blokdust/test_signal.hpp), so WASM feeds exactly the samples the native CLI does.
BD_EXPORT(bd_fill_test_sine) void bd_fill_test_sine(Host* h, double startSample, int frames, int sampleRate, double frequency, double gain) {
  for (int i = 0; i < frames && i < kMaxFrames; ++i)
    h->inLeft[i] = h->inRight[i] = testsignal::sine(static_cast<std::int64_t>(startSample) + i, sampleRate, frequency, gain);
}
BD_EXPORT(bd_left) float* bd_left(Host* h) { return h->left; }
BD_EXPORT(bd_right) float* bd_right(Host* h) { return h->right; }
BD_EXPORT(bd_max_frames) int bd_max_frames() { return kMaxFrames; }

// ---- events: read then clear (field: 0 sample, 1 tick, 2 type, 3 block, 4 other) ----
BD_EXPORT(bd_event_count) int bd_event_count(Host* h) { return static_cast<int>(h->engine.events().size()); }
BD_EXPORT(bd_event_field) double bd_event_field(Host* h, int i, int field) {
  const auto& e = h->engine.events()[static_cast<std::size_t>(i)];
  switch (field) {
    case 0: return static_cast<double>(e.sample); case 1: return e.tick; case 2: return static_cast<double>(e.type);
    case 3: return e.block; default: return e.other;
  }
}
BD_EXPORT(bd_clear_events) void bd_clear_events(Host* h) { h->engine.clearEvents(); }

// ---- snapshots for the UI ----
/// Packs particles as [x, y, size] * n (grid units) and returns n.
BD_EXPORT(bd_pack_particles) int bd_pack_particles(Host* h) {
  int n = 0;
  for (const auto& p : h->engine.particles()) {
    h->particles[n * 3] = static_cast<float>(p.x); h->particles[n * 3 + 1] = static_cast<float>(p.y); h->particles[n * 3 + 2] = p.size; ++n;
  }
  return n;
}
BD_EXPORT(bd_particles) float* bd_particles(Host* h) { return h->particles; }
/// Packs connected block-id pairs [a, b] (a < b in creation order) and returns the pair count.
BD_EXPORT(bd_pack_connections) int bd_pack_connections(Host* h) {
  return h->engine.connections(h->pairs, kMaxBlocks * 8);  // oldest connection first (R4a)
}
BD_EXPORT(bd_pairs) std::uint32_t* bd_pairs(Host* h) { return h->pairs; }
/// Packs ids of blocks with power > 0 (sources incl. emitters/lasers; drives v1's thick connection lines). Returns n.
BD_EXPORT(bd_pack_powered) int bd_pack_powered(Host* h) {
  int n = 0;
  for (const auto& b : h->engine.blocks()) if (b.alive && b.power() > 0) h->powered[n++] = b.id;
  return n;
}
BD_EXPORT(bd_powered) std::uint32_t* bd_powered(Host* h) { return h->powered; }
/// Packs laser beams [x0, y0, x1, y1]* (grid units) and returns the count.
BD_EXPORT(bd_pack_beams) int bd_pack_beams(Host* h) {
  int n = 0;
  for (const auto& b : h->engine.beams()) {
    h->beams[n * 4] = static_cast<float>(b.x0); h->beams[n * 4 + 1] = static_cast<float>(b.y0);
    h->beams[n * 4 + 2] = static_cast<float>(b.x1); h->beams[n * 4 + 3] = static_cast<float>(b.y1);
    h->beamIds[n] = b.laser; ++n;
  }
  return n;
}
BD_EXPORT(bd_beams) float* bd_beams(Host* h) { return h->beams; }
/// Packs sampler playheads [blockId, seconds]* (the open panel's playback lines, owner) and returns the count.
BD_EXPORT(bd_pack_playheads) int bd_pack_playheads(Host* h) {
  const int n = h->engine.playheads(h->playheads, 64);
  for (int i = 0; i < n; ++i) { h->playheadsOut[i * 2] = static_cast<float>(h->playheads[i].block); h->playheadsOut[i * 2 + 1] = h->playheads[i].seconds; }
  return n;
}
BD_EXPORT(bd_playheads) float* bd_playheads(Host* h) { return h->playheadsOut; }
/// 1 if an audio source is currently gated on (powered).
BD_EXPORT(bd_block_gate) int bd_block_gate(Host* h, std::uint32_t id) { const Block* b = h->engine.block(id); return b && b->gated() ? 1 : 0; }
/// A block's current param value (0 if no such block or param): the UI reads state the engine changes itself, e.g. a
/// Toggle's on/off after a particle hit (CHG-0013), so a saved or shared patch keeps it, as v1's did.
BD_EXPORT(bd_block_param) double bd_block_param(Host* h, std::uint32_t id, int param) {
  const Block* b = h->engine.block(id);
  return b && param >= 0 && static_cast<std::size_t>(param) < b->params.size() ? b->params[static_cast<std::size_t>(param)] : 0.0;
}

// Samples (CHG-0002 1.7): the host allocates buffers in WASM memory (bd_alloc), copies decoded audio in, attaches them.
// fx.convolver's built-in impulse response, for the options panel's waveform (no engine needed).
BD_EXPORT(bd_default_impulse) void bd_default_impulse(float* left, float* right, int frames, int sampleRate) {
  blokdust::dsp::makeDefaultImpulse(left, right, frames, sampleRate);
}
BD_EXPORT(bd_alloc) float* bd_alloc(std::uint32_t floats) { return new (std::nothrow) float[floats]; }
BD_EXPORT(bd_free) void bd_free(float* p) { delete[] p; }
BD_EXPORT(bd_attach_sample) int bd_attach_sample(Host* h, std::uint32_t id, float* left, float* right, std::uint32_t frames, double sampleRate) {
  return h->engine.attachSample(id, blokdust::SampleBuffer{left, right, frames, sampleRate}) ? 1 : 0;
}
