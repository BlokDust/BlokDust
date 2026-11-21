// Engine: power and hits: pulses, particles striking blocks, logic blocks, lasers.
#include "engine_internal.hpp"

namespace blokdust {

// ---------------------------------------------------------------------------------------------------------------
// simulation (SPEC-SIMULATION-POWER-AND-PARTICLES)
// ---------------------------------------------------------------------------------------------------------------

void Engine::pulse(Block& b, int ticks) noexcept {
  if (b.pulsePower >= kMaxPulsesPerBlock) return;
  b.pulseEndTick[b.pulsePower++] = tick_ + static_cast<std::uint32_t>(std::max(1, ticks));
}

void Engine::emit(Block& e) noexcept { emit(e, e.params[P::PowerEmitter::angle]); }

void Engine::emit(Block& e, double angleDeg) noexcept {
  if (particleCount_ >= kMaxParticles) return;
  const double angle = angleDeg * kDegToRad;
  const double speed = e.params[P::PowerEmitter::speed];  // v1 units per frame
  const double range = e.params[P::PowerEmitter::range];  // v1 units
  const double perTick = speed / kV1UnitsPerGrid / kTicksPerV1Frame;  // grid units per tick
  Particle& p = particles_[particleCount_++];
  p.x = e.x; p.y = e.y;
  p.vx = dmath::cos(angle) * perTick; p.vy = dmath::sin(angle) * perTick;
  p.life = static_cast<int>(std::lround(range / speed)) * kTicksPerV1Frame;
  p.size = 2.0f + rng_.nextFloat();
  p.fresh = true;
  log(Event::Type::Emit, e.id);
}

void Engine::particleHit(Block& b) noexcept {
  if (b.kind() == BlockKind::Logic) { logicHit(b); return; }
  // SIMULATION-0008 (owner, 2026-11-14; v1 only lengthened the note): a hit on a source that only earlier hits are
  // holding strikes it again, so fast particles play every note (a new Random Note pick each time).
  // SIMULATION-0008/0012: a hit on what earlier hits hold strikes or fires it again.
  strikeAgain(b);
  pulse(b, kPulseTicks);  // sources (incl. lasers) get a momentary pulse of power
}

/// Strike a pulse-held source again (SIMULATION-0008): the power voice's envelope starts over (a sampler from its
/// start); an arranged source lets its notes go and plays them as a new trigger.
void Engine::restrike(int slot) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  if (b.type == BlockType::SourceStage) return;
  if (b.arranged) {
    for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) releaseVoice(slot, v);
    arrange(slot, true);
    return;
  }
  if (b.monoVoice < 0) return;
  Voice& vo = b.voices[static_cast<std::size_t>(b.monoVoice)];
  if (!vo.active || vo.controller != 0) return;  // a key has the voice: power only keeps it
  b.envFromChain = true;
  vo.env.configure(envelopeFor(slot), sampleRate_);
  vo.env.gateOn();
  vo.trigTick = tick_;
  if (isSampler(b.type)) { vo.playhead = b.params[P::SourceSample::startPosition] * b.sampleRate; vo.samplePlaying = b.sampleFrames > 0; }
  log(Event::Type::GateOn, b.id);
}

/// Only hits (particles' pulses, beams) hold this Emitter or Laser running: no Power, Toggle, press, key or Self
/// Powered (SIMULATION-0012).
bool Engine::heldOnlyByHits(const Block& b) noexcept {
  if (b.staticPower != 0 || b.pressPower != 0 || b.keyPower != 0) return false;
  if (b.type == BlockType::PowerLaser) return b.params[P::PowerLaser::selfPoweredMode] == 0.0;
  if (b.type == BlockType::PowerEmitter) return b.params[P::PowerEmitter::selfPoweredMode] == 0.0;
  return false;
}

/// A pulse arrives (a particle, a Pulse or a Counter firing) at a block earlier hits are holding (SIMULATION-0008,
/// SIMULATION-0012): a source is struck again; an Emitter or Laser fires again. Call before adding the pulse.
void Engine::strikeAgain(Block& b) noexcept {
  if (b.kind() == BlockKind::AudioSource) { if (b.powerOn && b.staticPower == 0 && b.laserPower == 0 && b.pressPower == 0) b.restrike = true; }
  else if (b.power() > 0 && heldOnlyByHits(b)) b.restrike = true;
}

/// A beam fired again reaches a block it was already on (SIMULATION-0012): a source held only by hits plays again (as
/// SIMULATION-0008); an Emitter or Laser held only by hits fires again.
void Engine::beamStrike(Block& b) noexcept {
  if (b.kind() == BlockKind::AudioSource) { if (b.powerOn && b.staticPower == 0 && b.pressPower == 0) b.restrike = true; }
  else if (heldOnlyByHits(b)) b.restrike = true;
}

/// A Gate is open (R5c, SIMULATION-0011) while a power block powers it; `invert` swaps that. Never switched by hits.
bool Engine::gateOpen(const Block& g) const noexcept {
  const bool powered = worldPower_ && g.staticPower + g.pulsePower > 0;
  return powered != (g.params[P::PowerGate::invert] != 0.0);
}

/// A Power with Hits Cut Power (SIMULATION-0009): hits cut it, rather than pass through.
bool Engine::gapsOnHit(const Block& b) noexcept { return b.type == BlockType::PowerPower && b.params[P::PowerPower::cutByHits] != 0.0; }

/// A particle on a Power with Hits Cut Power: no power from it for a hit's length (kPulseSeconds, as a particle's hit on
/// a source), so its sources let go and are struck again when it comes back. A hit during a cut starts it over.
void Engine::powerGap(Block& b) noexcept {
  log(Event::Type::Logic, b.id);
  b.gapUntil = tick_ + static_cast<std::uint32_t>(kPulseTicks);
  recomputeStaticPower();
}

void Engine::logicHit(Block& b) noexcept {
  if (b.type == BlockType::PowerToggle) {
    b.params[P::PowerToggle::logic] = b.params[P::PowerToggle::logic] != 0.0 ? 0.0 : 1.0;
    log(Event::Type::Logic, b.id);
    recomputeStaticPower();
    return;
  }
  if (b.type == BlockType::PowerPulse) {
    log(Event::Type::Logic, b.id);
    // R2b (CHG-0029, SIMULATION-0010): with a Delay, the hit waits that long (`delayBeats` at the tempo when synced);
    // each hit keeps its own wait, up to kMaxPulseDelays at once. 0 is v1: at once.
    const bool synced = b.params[P::PowerPulse::sync] != 0.0;
    const double wait = std::clamp(synced ? b.params[P::PowerPulse::delayBeats] * 60.0 / tempo_ : b.params[P::PowerPulse::delay], 0.0, 60.0);
    const long ticks = std::lround(wait * kTickRate);
    if (ticks <= 0) { firePulse(b); return; }
    if (b.pulseDelayCount < kMaxPulseDelays) b.pulseFireTick[static_cast<std::size_t>(b.pulseDelayCount++)] = tick_ + static_cast<std::uint32_t>(ticks);
    return;
  }
  if (b.type == BlockType::PowerCounter) {  // R2c: a switch with steps; on while its step is active
    log(Event::Type::Logic, b.id);
    const bool was = b.counterFired;
    if (advanceCounter(b) != was) recomputeStaticPower();
    return;
  }
  if (b.type == BlockType::PowerChance) {  // R2d: a switch set by a roll; on while the last hit's roll passed
    log(Event::Type::Logic, b.id);
    const bool was = b.counterFired;
    b.counterFired = chanceRoll(b);
    log(b.counterFired ? Event::Type::Pass : Event::Type::Block, b.id);
    if (b.counterFired != was) recomputeStaticPower();
  }
}

/// A Pulse fires: v1 Pulse powers the connected sources for `pulseLength` s (its slider); synced, `pulseBeats` at the
/// current tempo (CHG-0004 3.5).
void Engine::firePulse(Block& b) noexcept {
  pulseConnected(b, static_cast<int>(std::lround((b.params[P::PowerPulse::sync] != 0.0
    ? b.params[P::PowerPulse::pulseBeats] * 60.0 / tempo_ : b.params[P::PowerPulse::pulseLength]) * kTickRate)));
}

/// Power the blocks connected to power block `b` for `ticks`.
void Engine::pulseConnected(Block& b, int ticks) noexcept {
  const auto& row = graph_.row(slotOf(b.id));
  for (int k = 0; k < orderCount_; ++k) {
    Block& s = blocks_[order_[k]];
    if (row[order_[k]] && takesPower(s.kind())) { strikeAgain(s); pulse(s, ticks); }  // SIMULATION-0012
  }
}

void Engine::releaseLaser(Block& laser) noexcept {
  for (int k = 0; k < orderCount_; ++k) {
    Block& t = blocks_[order_[k]];
    if (laser.laserHits[static_cast<std::size_t>(order_[k])] && t.kind() != BlockKind::Logic && t.laserPower > 0) t.laserPower--;
  }
  laser.laserHits.reset();
  laser.beamOn = false;
}

static_assert(P::PowerSoundLaser::angle == P::PowerLaser::angle && P::PowerSoundLaser::range == P::PowerLaser::range,
              "the Sound Laser's beam params line up with the Laser's");

/// SPEC-SIMULATION R7–R10. Beams are recomputed every tick in creation order, so a laser powered by an earlier laser
/// this tick fires this tick. Unlike v1, the beam stops at the *nearest* Void before any block is tested.
void Engine::runLasers() noexcept {
  beamCount_ = 0;
  // Hits Cut Power: a Power gives no power while any beam touches it (owner, 2026-11-20), worked out afresh each tick.
  std::bitset<kMaxBlocks> wasCut;
  for (int k = 0; k < orderCount_; ++k) { Block& b = blocks_[order_[k]]; wasCut[static_cast<std::size_t>(order_[k])] = b.beamCut; b.beamCut = false; }
  struct Recheck { Engine& e; const std::bitset<kMaxBlocks>& was; ~Recheck() {
    for (int k = 0; k < e.orderCount_; ++k) if (e.blocks_[e.order_[k]].beamCut != was[static_cast<std::size_t>(e.order_[k])]) { e.recomputeStaticPower(); return; }
  } } recheck{*this, wasCut};
  for (int k = 0; k < orderCount_; ++k) {
    Block& l = blocks_[order_[k]];
    const bool sound = l.type == BlockType::PowerSoundLaser;  // CHG-0016: its beam is gated by what it hears
    if (l.type != BlockType::PowerLaser && !sound) continue;
    const bool running = worldPower_ && (sound ? l.listenOn : l.params[P::PowerLaser::selfPoweredMode] != 0.0 || l.power() > 0);
    const bool again = l.restrike;  // fired again (SIMULATION-0012): what the beam is on is hit again
    l.restrike = false;
    if (!running) { l.laserTurning = false; if (l.laserHits.any() || l.beamOn) releaseLaser(l); continue; }
    // v1 rotates only while *powered* (IsPowered: PowerAmount > 0), not when merely self-powered.
    const double rotate = sound ? 0.0 : l.params[P::PowerLaser::rotate];  // the Sound Laser does not turn (owner, 2026-11-14)
    const bool synced = !sound && l.params[P::PowerLaser::sync] != 0.0;
    // Restart (R9a): each time it starts turning (synced: running; free: powered) it starts again from its Angle.
    const bool turning = synced || l.power() > 0;
    if (turning && !l.laserTurning && !sound && l.params[P::PowerLaser::restart] != 0.0) {
      l.laserBeat0 = beat_;
      if (!synced) l.params[P::PowerLaser::angle] = l.laserAngle0;
    }
    l.laserTurning = turning;
    if (synced) {
      // Synced (owner): one full turn every |turnBeats| (negative: anticlockwise), locked to the beat: at beat 0 it
      // points at the Angle set, so every take from the same position turns the same (owner review 2). With Restart,
      // it points at the Angle set when it starts turning instead (R9a).
      const double tb = l.params[P::PowerLaser::turnBeats];
      const double since = l.params[P::PowerLaser::restart] != 0.0 ? beat_ - l.laserBeat0 : beat_;
      double a = std::fmod(l.laserAngle0 + (tb < 0.0 ? -360.0 : 360.0) * since / std::max(0.25, std::abs(tb)) + 270.0, 360.0);
      if (a <= 0.0) a += 360.0;
      l.params[P::PowerLaser::angle] = a - 270.0;
    } else if (l.power() > 0 && std::lround(rotate) != 0) {
      double a = l.params[P::PowerLaser::angle] + rotate / 100.0 / kTicksPerV1Frame;
      if (a > 90.0) a -= 360.0;
      if (a < -270.0) a += 360.0;
      l.params[P::PowerLaser::angle] = a;
    }
    const double len = l.params[P::PowerLaser::range] / kV1UnitsPerGrid;
    std::bitset<kMaxBlocks> hits;
    double stop = 1.0;
    traceBeam(order_[k], l.params[P::PowerLaser::angle], len, hits, stop);
    for (int i = 0; i < orderCount_; ++i) if (hits[static_cast<std::size_t>(order_[i])] && gapsOnHit(blocks_[order_[i]])) blocks_[order_[i]].beamCut = true;
    for (int i = 0; i < orderCount_; ++i) {  // newly hit, in creation order
      const int s = order_[i];
      const bool was = l.laserHits[static_cast<std::size_t>(s)];
      if (!hits[static_cast<std::size_t>(s)] || (was && !again)) continue;
      Block& b = blocks_[s];
      log(Event::Type::Hit, b.id, l.id);
      if (gapsOnHit(b)) log(Event::Type::Logic, b.id);  // a beam arriving cuts it (beamCut below), logged once
      else if (b.kind() == BlockKind::Logic) logicHit(b);
      else if (was) beamStrike(b);
      else b.laserPower++;
    }
    for (int i = 0; i < orderCount_; ++i) {  // no longer hit: release continuous power
      const int s = order_[i];
      if (l.laserHits[static_cast<std::size_t>(s)] && !hits[static_cast<std::size_t>(s)] && blocks_[s].kind() != BlockKind::Logic && blocks_[s].type != BlockType::PowerPower && blocks_[s].laserPower > 0) blocks_[s].laserPower--;
    }
    l.laserHits = hits;
    l.beamOn = true;
    l.beamLength = len * stop;
  }
}

/// A Counter takes one hit (R2c): the Euclidean pattern E(hits, steps), read from `rotate`, one step per hit, unless
/// its steps were set by hand (`pattern` ≥ 0). Returns whether the step was active.

}  // namespace blokdust
