#pragma once
// BlokDust engine: owns the patch, derives proximity connections, runs the fixed-tick simulation and renders audio.
// Threading: `push()` from one control thread; everything else from the audio thread (or a single offline thread).
#include <array>
#include <cmath>
#include <cstdint>
#include <bitset>
#include <memory>
#include <vector>
#include <span>

#include "blokdust/config.hpp"
#include "blokdust/connections.hpp"
#include "blokdust/rng.hpp"
#include "blokdust/spsc_queue.hpp"
#include "blokdust/convolver.hpp"
#include "blokdust/world.hpp"

namespace blokdust {

struct Command {
  /// NoteOn/NoteOff: param = MIDI note, value = velocity (0..1). id = controller block, or 0 = every controller of
  /// type `blockType` (MIDI input → input.midi-controller, computer keys → input.computer-keyboard).
  /// Press: the pointer is held on block `id` (value 1) or released (value 0).
  /// NoteOn/NoteOff/NoteExpression: x = MIDI channel 0–15 (the note's own channel under MPE, PLUGIN-0004).
  /// NoteExpression: y = dimension (0 pitch bend in semitones, 1 pressure 0–1, 2 slide 0–1), value = its value.
  /// Tempo: value = BPM; x = beat position (quarter notes) to jump to, or < 0 to keep counting; y = 1: the transport
  /// started, resync the world to x (SIMULATION-0003).
  /// Relink: blocks `id` and `value` (a block id) count as connected now, so they move to the end of each other's
  /// connection order (SPEC-CONNECTIONS-PROXIMITY R4a). Patch loaders replay a saved `connectionOrder` with it.
  /// Reset: block `id` starts over (a Counter goes back to step 1, SIMULATION-0005).
  enum class Type : std::uint8_t { AddBlock, RemoveBlock, MoveBlock, SetParam, NoteOn, NoteOff, SetMaster, Press, NoteExpression, Tempo, WorldPower, Relink, Reset };
  enum class Expression : std::uint8_t { Bend = 0, Pressure = 1, Slide = 2 };
  Type type{};
  BlockId id = kInvalidBlock;
  BlockType blockType{};
  double x = 0.0, y = 0.0;
  std::uint8_t param = 0;
  double value = 0.0;
  /// Apply at the first tick boundary at or after this sample (-1 = as soon as possible). Lets offline renders and
  /// tests schedule edits sample-exactly, independent of audio buffer size.
  std::int64_t atSample = -1;
  /// NoteOn/NoteOff/NoteExpression from outside a Stage block (CHG-0021, UI-0012): the note reaches every controller
  /// of this inner world (its Keyboards, MIDI Inputs, Touchpads and Stage Ins) except those of type `blockType`, which
  /// heard it already (the computer's keys and MIDI reach every world). Made by the engine only, never by a host.
  bool outside = false;

  static Command add(BlockId id, BlockType t, double x, double y, std::int64_t at = -1) { Command c; c.type = Type::AddBlock; c.id = id; c.blockType = t; c.x = x; c.y = y; c.atSample = at; return c; }
  static Command remove(BlockId id, std::int64_t at = -1) { Command c; c.type = Type::RemoveBlock; c.id = id; c.atSample = at; return c; }
  static Command move(BlockId id, double x, double y, std::int64_t at = -1) { Command c; c.type = Type::MoveBlock; c.id = id; c.x = x; c.y = y; c.atSample = at; return c; }
  static Command setParam(BlockId id, std::uint8_t p, double v, std::int64_t at = -1) { Command c; c.type = Type::SetParam; c.id = id; c.param = p; c.value = v; c.atSample = at; return c; }
  static Command noteOn(BlockType controllerType, std::uint8_t note, double velocity = 1.0, std::int64_t at = -1, int channel = 0) { Command c; c.type = Type::NoteOn; c.blockType = controllerType; c.param = note; c.value = velocity; c.atSample = at; c.x = channel; return c; }
  static Command noteExpression(BlockType controllerType, std::uint8_t note, int channel, Expression dim, double value, std::int64_t at = -1) {
    Command c; c.type = Type::NoteExpression; c.blockType = controllerType; c.param = note; c.x = channel; c.y = static_cast<double>(dim); c.value = value; c.atSample = at; return c;
  }
  /// v1 Settings › Master Volume: master output gain (linear; v1's −12 dB = 0.25 by default).
  /// `transportStart`: the DAW's transport just started (y = 1): the world resyncs to the position (owner review 2).
  static Command tempo(double bpm, double beat = -1.0, std::int64_t at = -1, bool transportStart = false) {
    Command c; c.type = Type::Tempo; c.value = bpm; c.x = beat; c.y = transportStart ? 1.0 : 0.0; c.atSample = at; return c;
  }
  static Command setMaster(double gain, std::int64_t at = -1) { Command c; c.type = Type::SetMaster; c.value = gain; c.atSample = at; return c; }
  /// The app's power switch (owner, 2026-11-11, CHG-0005): off, nothing in the world powers anything (Power and Toggle
  /// blocks, emitters, lasers; particles in flight vanish). What the player does still plays: held blocks, keys, MIDI.
  /// WorldPower: value = on; x = 1: when off, particles in flight carry on (a Stage's Keep Particles, CHG-0021); else they vanish.
  static Command worldPower(bool on, std::int64_t at = -1, bool keepParticles = false) { Command c; c.type = Type::WorldPower; c.value = on ? 1.0 : 0.0; c.atSample = at; c.x = keepParticles ? 1.0 : 0.0; return c; }
  /// v1 Source.MouseDown/MouseUp → AddPower/RemovePower: a held source (audio or power source) is powered.
  static Command relink(BlockId a, BlockId b, std::int64_t at = -1) { Command c; c.type = Type::Relink; c.id = a; c.value = static_cast<double>(b); c.atSample = at; return c; }
  static Command reset(BlockId id, std::int64_t at = -1) { Command c; c.type = Type::Reset; c.id = id; c.atSample = at; return c; }
  static Command press(BlockId id, bool down, std::int64_t at = -1) { Command c; c.type = Type::Press; c.id = id; c.value = down ? 1.0 : 0.0; c.atSample = at; return c; }
  static Command noteOff(BlockType controllerType, std::uint8_t note, std::int64_t at = -1, int channel = 0) { Command c; c.type = Type::NoteOff; c.blockType = controllerType; c.param = note; c.atSample = at; c.x = channel; return c; }
};

struct Event {
  /// Pass / Block (CHG-0015): a Counter or Chance let a particle or beam through, or stopped it (`other`: the laser).
  /// Split: a Prism turned a particle into its streams.
  enum class Type : std::uint8_t { Emit, Hit, Absorb, Expire, GateOn, GateOff, Connect, Disconnect, Logic, Pass, Block, Split };
  std::int64_t sample;   // absolute sample index (always a tick boundary)
  std::uint32_t tick;
  Type type;
  BlockId block;         // primary block (emitter, hit block, gated source, ...)
  BlockId other;         // secondary block (connection peer) or 0
};

/// A laser beam for the UI (grid units).
struct Beam { BlockId laser; double x0, y0, x1, y1; };

/// Decoded audio for a source.sample block (CHG-0002 1.7). Host-owned memory (the engine never allocates or decodes on
/// the audio thread, DATA-0005: samples are the user's own files); it must outlive the attachment.
struct SampleBuffer { const float* left = nullptr; const float* right = nullptr; std::uint32_t frames = 0; double sampleRate = 48000.0; };

class Engine;

struct EngineConfig {
  int sampleRate = 48000;
  std::uint64_t seed = 1;
  bool masterCompressor = true;  // v1's master bus compressor; off only in DSP unit tests that measure raw levels
  /// Plugins: v1's Microphone is the DAW track ("Audio Input"), so it is passed through like Audio In (stereo, unity ×
  /// gain, skipping the master stage). The website keeps v1's Microphone level.
  bool hostInput = false;
  /// A Stage block's inner world (CHG-0021, SCOPE-0006): no master stage of its own (its output is a source in the
  /// outer patch), a quarter of the effect pools, and no Stage blocks of its own (depth 2). `parent`: the engine it
  /// will be attached to, whose oscillator tables and built-in impulse response it shares (so making one is cheap).
  bool child = false;
  const Engine* parent = nullptr;
};

class Engine {
 public:
  explicit Engine(const EngineConfig& cfg);

  /// Control thread. Returns false if the queue is full.
  bool push(const Command& c) noexcept { return queue_.push(c); }

  /// Audio thread. Renders `frames` samples of stereo audio. Output is independent of how calls are split into blocks.
  void process(float* left, float* right, std::uint32_t frames) noexcept;
  /// Same, with host input audio for source.audio-in blocks (inputs may be null = silence; may alias the outputs).
  void process(const float* inLeft, const float* inRight, float* left, float* right, std::uint32_t frames) noexcept;
  /// Audio thread only: apply a command immediately (MIDI and host automation in plugins). Not via the queue, so the
  /// audio thread never becomes a second producer. Due queued commands are applied first, so order is preserved
  /// (e.g. host automation on the first block must not run before the patch's AddBlock commands).
  void applyNow(const Command& c) noexcept { applyDueCommands(); apply(c); }
  /// Apply the commands already due (e.g. a patch's blocks) without rendering, so samples can be attached before the
  /// first process() call. The result is unchanged: they would apply at the same sample anyway.
  void prime() noexcept { applyDueCommands(); }

  /// Dust 1–8 (PLUGIN-0003): map a normalised 0..1 host value onto a block param via its v1 slider range.
  static bool mapAutomation(BlockType t, std::uint8_t param, double normalised, double& out) noexcept;

  /// Audio thread (between process calls): give a source.sample block its decoded audio, or detach with frames = 0.
  /// For fx.convolver the buffer is the impulse response (frames = 0: back to the built-in one); building its
  /// spectra takes a few milliseconds on this thread, once per load.
  /// Fresh loads set v1's region defaults (start 0, end = length, loop from half way to the end) unless the patch has
  /// a region already (endPosition > 0).
  bool attachSample(BlockId id, const SampleBuffer& s) noexcept;
  /// Audio thread (between process calls): give a source.stage block its inner world, an Engine made with
  /// EngineConfig::child. Host-owned: it must outlive the attachment (nullptr detaches; removing the block detaches).
  /// The inner world then runs in step with this one: same ticks, same tempo, its world power following the block's.
  bool attachStage(BlockId id, Engine* inner) noexcept;
  /// The inner world attached to a source.stage block, or nullptr.
  Engine* stage(BlockId id) const noexcept;

  // ---- introspection (audio thread / tests; a lock-free snapshot API for the UI comes with the web spike) ----
  std::int64_t sampleClock() const noexcept { return sample_; }
  std::uint32_t tickCount() const noexcept { return tick_; }
  std::span<const Particle> particles() const noexcept { return {particles_.data(), static_cast<std::size_t>(particleCount_)}; }
  std::span<const Event> events() const noexcept { return {events_.data(), static_cast<std::size_t>(eventCount_)}; }
  std::uint64_t droppedEvents() const noexcept { return droppedEvents_; }
  /// Audio thread: forget logged events (hosts that stream events drain them every block).
  void clearEvents() noexcept { eventCount_ = 0; }
  const Block* block(BlockId id) const noexcept { const int s = slotOf(id); return s < 0 ? nullptr : &blocks_[static_cast<std::size_t>(s)]; }
  bool connected(BlockId a, BlockId b) const noexcept;
  const ConnectionGraph& graph() const noexcept { return graph_; }
  /// Connected pairs as block ids [a, b]*, the oldest connection first (R4a: what a patch saves as `connectionOrder`).
  /// Returns the pair count (at most maxPairs). No allocation: safe on the audio thread.
  int connections(std::uint32_t* pairs, int maxPairs) const noexcept;
  const std::array<Block, kMaxBlocks>& blocks() const noexcept { return blocks_; }
  const Chains& chains() const noexcept { return chains_; }
  int slotOf(BlockId id) const noexcept;
  std::span<const Beam> beams() const noexcept { return {beams_.data(), static_cast<std::size_t>(beamCount_)}; }
  /// Where each sampler is playing (owner: the open panel draws a line per voice / grain): one entry per sounding
  /// Sample / Recorder / SampleGen voice (position in the region's playback order: mirrored when reversed, as the
  /// panel's waveform is) and per sounding Granular grain, in seconds of the file. Returns the count (≤ max).
  struct Playhead { BlockId block; float seconds; };
  int playheads(Playhead* out, int max) const noexcept;
  /// Live readouts for open options panels, one entry per block that has any (visual only; returns the count ≤ max).
  /// fx.compressor (CHG-0014): v[0] input level in dB (peak, falling slowly), v[1] gain reduction in dB (≤ 0).
  /// fx.lfo (CHG-0018): v[0] the target block's id (0: none), v[1] the target param's index, v[2] its value now.
  /// power.sound-laser (CHG-0016): v[0] the level it hears in dB, v[1] 1 while its beam is on.
  /// power.counter (CHG-0015): v[0] the step the next hit lands on, v[1] 1 if the last hit passed.
  /// power.prism: v[0] its exit angle now (it may be rotating).
  struct Monitor { BlockId block; float v[4]; };
  int monitors(Monitor* out, int max) const noexcept;

 private:
  void applyDueCommands() noexcept;
  void apply(const Command& c) noexcept;
  void onTopologyChanged(int slot, const ConnectionGraph::Row& before) noexcept;
  void recomputeStaticPower() noexcept;
  void configureDsp(Block& b) noexcept;
  void runTick() noexcept;
  void emit(Block& emitter) noexcept;
  void emit(Block& emitter, double angleDeg) noexcept;
  void particleHit(Block& b) noexcept;
  void restrike(int slot) noexcept;
  void powerGap(Block& b) noexcept;
  static bool gapsOnHit(const Block& b) noexcept;
  void pulse(Block& b, int ticks) noexcept;
  void firePulse(Block& b) noexcept;
  void pulseConnected(Block& b, int ticks) noexcept;
  bool advanceCounter(Block& c) noexcept;
  void updateGates() noexcept;
  static std::int64_t beatSlotAt(const Block& e, double beat) noexcept;
  void keyAim(Block& b, int note, bool down, bool poly) noexcept;
  void resyncToTransport(double beat) noexcept;
  void runLasers() noexcept;
  void traceBeam(int laserSlot, double angleDeg, double len, std::bitset<kMaxBlocks>& hits, std::bitset<kMaxBlocks>& gates, std::bitset<kMaxBlocks>& open, double& firstStop) noexcept;
  bool gateDecide(Block& g) noexcept;
  void logicHit(Block& b) noexcept;
  void applyNote(const Command& c) noexcept;
  void applyExpression(const Command& c) noexcept;
  bool controllerHears(const Block& ctrl, const Command& c) const noexcept;
  void forwardToStage(const Block& stage, const Block& ctrl, const Command& c) noexcept;
  void releaseStageNotes() noexcept;
  bool keepsParticles(const Block& b) const noexcept;
  void renderGranular(Block& b, int n) noexcept;
  static bool acceptsChannel(const Block& ctrl, int channel) noexcept;
  // v1 Source voices (Source.NoteOn/NoteOff/GetVoice/RemoveVoice/SetPitch)
  void voiceOn(int slot, BlockId controller, int key, bool poly, double glide, bool envFromChain, int channel = 0, double offset = 0.0) noexcept;
  // Arranged sources (CHG-0017, AUDIO-0002): see Block::arranged.
  struct NoteFx { int random = -1, chord = -1, arp = -1; };
  NoteFx noteFxFor(int slot) const noexcept;
  bool wantsArranged(int slot) const noexcept;
  void arrange(int slot, bool trigger) noexcept;
  void arrangedKey(int slot, const Block& ctrl, int key, int channel, bool on) noexcept;
  void stepArps() noexcept;
  void runModulators() noexcept;
  void paramChanged(int slot, std::uint8_t param) noexcept;
  bool arpTick_ = false;  // set while stepArps re-arranges a source: its Arpeggiator moves on
  static bool keysSetPitch(const Block& ctrl) noexcept;
  void voiceOff(int slot, BlockId controller, int key, int channel = 0) noexcept;
  void releaseVoice(int slot, int v) noexcept;
  void setPitch(int slot, int v, double glide) noexcept;
  void applyPitch(Block& b, Voice& v) noexcept;
  double controllerMods(int slot) const noexcept;
  void refreshVoices(int slot) noexcept;
  void updateNotePower(Block& b) noexcept;
  void releaseLaser(Block& laser) noexcept;
  void render(float* left, float* right, int n) noexcept;
  void addHostInput(const Block& b, int n) noexcept;
  void renderChain(int c, int n) noexcept;
  void beginRoutingFade() noexcept;
  void switchRouting() noexcept;
  void acquireDsp(Block& b, int slot) noexcept;
  void releaseDsp(Block& b) noexcept;
  dsp::Envelope::Settings envelopeFor(int slot) const noexcept;

  /// Fixed pools of delay memory for effects with long delay lines (allocated at construction; acquiring and
  /// releasing on the audio thread is allocation-free). When a pool is exhausted the effect is bypassed.
  struct FxPool {
    int lines = 0, capacity = 0;
    std::uint32_t lineSize = 0;
    std::vector<float> mem;
    std::vector<std::int16_t> owner;  // slot using each instance, −1 when free
    void init(int linesPer, std::uint32_t size, int count);
    int acquire(int slot) noexcept;
    void release(int index) noexcept { if (index >= 0 && index < capacity) owner[static_cast<std::size_t>(index)] = -1; }
    std::span<float> line(int index, int k) noexcept {
      return {mem.data() + (static_cast<std::size_t>(index) * static_cast<std::size_t>(lines) + static_cast<std::size_t>(k)) * lineSize, lineSize};
    }
  };
  void log(Event::Type t, BlockId a, BlockId b = kInvalidBlock) noexcept;
  /// Sample of tick k. The grid restarts at the DAW transport's start (tickOrigin_, tickBase_; owner review 2).
  std::int64_t tickSample(std::uint32_t k) const noexcept {
    return tickOrigin_ + static_cast<std::int64_t>(k - tickBase_) * sampleRate_ / kTickRate;
  }
  std::int64_t tickOrigin_ = 0;
  std::uint32_t tickBase_ = 0;

  int sampleRate_;
  double gainGlide_ = 1.0;  // per-sample one-pole step of Voice::gainNow toward exprGain (~5 ms)
  /// The voice's pressure gain this sample: exactly exprGain once settled (so voices without MPE are untouched).
  double glideGain(Voice& vo) const noexcept {
    if (vo.gainNow != vo.exprGain) {
      vo.gainNow += (vo.exprGain - vo.gainNow) * gainGlide_;
      if (std::abs(vo.exprGain - vo.gainNow) < 1e-7) vo.gainNow = vo.exprGain;
    }
    return vo.gainNow;
  }
  Pcg32 rng_;
  std::int64_t sample_ = 0;
  std::uint32_t tick_ = 0;
  double tempo_ = 120.0;   // BPM: the patch's, or the host's (SIMULATION-0003)
  bool worldPower_ = true;  // Command::WorldPower
  double beat_ = 0.0;      // musical position in quarter notes at the current tick
  std::uint64_t nextOrder_ = 1;

  SpscQueue<Command, kCommandQueueCapacity> queue_;
  std::array<Block, kMaxBlocks> blocks_{};
  std::array<std::uint16_t, kMaxBlocks> order_{};  // alive slots by creation order
  int orderCount_ = 0;
  ConnectionGraph graph_;
  struct PairAge { std::uint32_t since; std::uint16_t a, b; };
  mutable std::array<PairAge, kMaxBlocks * 8> pairScratch_{};  // connections(): sorted by age
  Chains chains_;

  std::array<Particle, kMaxParticles> particles_{};
  int particleCount_ = 0;

  std::array<Event, kEventLogCapacity> events_{};
  int eventCount_ = 0;
  std::uint64_t droppedEvents_ = 0;

  std::uint64_t seed_ = 1;
  std::array<float, kMaxSegment> chainL_{}, chainR_{}, mixL_{}, mixR_{};
  // Audio In chains (owner review 2): the host input, stereo, and the mix of those chains, which skips the master stage.
  std::array<float, kMaxSegment> hostL_{}, hostR_{}, directL_{}, directR_{};
  bool chainDirect_ = false;  // set by renderChain: this chain holds an Audio In
  std::array<double, kMaxSegment> detune_{};
  FxPool reverbPool_, delayPool_, chorusPool_, pitchPool_;
  // fx.convolver: running state and user impulse responses per pooled instance, plus the shared built-in response.
  std::vector<dsp::Convolver> convolvers_;
  std::vector<dsp::ConvolutionKernel> userImpulses_;
  std::vector<std::int16_t> convolverOwner_;
  std::shared_ptr<const dsp::ConvolutionKernel> defaultImpulse_;  // a child shares its parent's
  std::vector<dsp::MasterCompressor> compressors_;  // fx.compressor instances (pooled like the convolvers)
  std::vector<std::int16_t> compressorOwner_;
  // power.sound-laser (CHG-0016, SIMULATION-0007): what each hears this segment (mono), pooled.
  std::vector<float> listenBuf_;
  std::array<std::int16_t, kMaxListeners> listenerOwner_{};
  double listenDecay_ = 1.0;
  void listen(int n) noexcept;

  // Rewiring fade (SPEC-CONNECTIONS-PROXIMITY R5): audio follows `audioChains_`; when the topology changes, only the
  // chains that changed fade out on the old routing, the routing switches, and the new chains fade in.
  enum class Fade : std::uint8_t { Idle, Out, In };
  Chains audioChains_, prevChains_;
  Fade fade_ = Fade::Idle;
  int fadePos_ = 0, fadeLen_ = 240;
  bool routingDirty_ = false;
  std::bitset<kMaxBlocks> fadingChains_;  // chain indices (of audioChains_) affected by the current fade
  const float* inLeft_ = nullptr;   // host input for source.audio-in, valid during process()
  const float* inRight_ = nullptr;
  int inOffset_ = 0;
  dsp::MasterCompressor compressor_;
  std::shared_ptr<const dsp::TableBank> tables_;  // the Wavetable block's tables (CHG-0031), built once like wavetables_
  std::shared_ptr<const dsp::WavetableBank> wavetables_;  // oscillator tables, built once (allocates here only); a child shares its parent's
  // source.stage (CHG-0021): inner worlds by pool index, and what each rendered this segment (stereo).
  std::array<Engine*, kMaxStages> stages_{};
  std::array<std::int16_t, kMaxStages> stageOwner_{};
  // Notes an outer controller is holding inside each Stage (CHG-0021, UI-0012): the key as played and as sent in (with
  // the outer controller's octave), so its NoteOff and expression reach the same inner key.
  struct StageNote { BlockId ctrl; std::uint8_t key, channel, sent; };
  static constexpr int kStageNotes = 32;
  std::array<std::array<StageNote, kStageNotes>, kMaxStages> stageNotes_{};
  std::array<int, kMaxStages> stageNoteCount_{};
  std::vector<float> stageBuf_;
  std::array<float, kMaxSegment> stageL_{}, stageR_{};
  bool chainStage_ = false;
  bool child_ = false;
  bool useCompressor_ = true;
  bool hostInput_ = false;
  double masterGain_ = kMasterGain;
  std::array<Beam, kMaxBeams> beams_{};
  int beamCount_ = 0;
};

}  // namespace blokdust
