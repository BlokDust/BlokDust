// Engine: the simulation tick (SIMULATION-0001): counters, beams traced, beat slots, runTick, gates.
#include "engine_internal.hpp"

namespace blokdust {

bool Engine::advanceCounter(Block& c) noexcept {
  const int steps = std::clamp(static_cast<int>(std::lround(c.params[P::PowerCounter::steps])), 1, 16);
  const int hits = std::clamp(static_cast<int>(std::lround(c.params[P::PowerCounter::hits])), 0, steps);
  const int rotate = std::clamp(static_cast<int>(std::lround(c.params[P::PowerCounter::rotate])), 0, 15);
  const int at = (c.counterStep % steps + rotate) % steps;
  const long mask = std::lround(c.params[P::PowerCounter::pattern]);
  const bool active = mask >= 0 ? ((mask >> (c.counterStep % steps)) & 1) != 0 : (at * hits) % steps < hits;  // steps set by hand win
  c.counterStep = (c.counterStep % steps + 1) % steps;
  c.counterFired = active;
  return active;
}

/// A Chance rolls for one hit (R2d): its own random stream (seeded by block id, as Granular's grains, so the patch seed
/// stays visual-only).
bool Engine::chanceRoll(Block& c) noexcept {
  return static_cast<double>(c.grainRng.nextFloat()) < c.params[P::PowerChance::chance];
}

/// One laser's beams (SPEC-SIMULATION R7, R7a). A beam runs to the nearest thing that stops it: a Void or a Prism,
/// where it carries on as the Prism's streams with the length it has left (SIMULATION-0006). Every source and logic block a beam crosses before that is hit. Never through the same Prism
/// twice on one path, nor through more than kMaxPrismDepth; at most kMaxBeamSegments beams per laser.
void Engine::traceBeam(int laserSlot, double angleDeg, double len, std::bitset<kMaxBlocks>& hits, double& firstStop) noexcept {
  struct Seg { double x0, y0, angle, len; int depth; std::array<std::int16_t, kMaxPrismDepth> via; };
  std::array<Seg, kMaxBeamSegments> stack;
  int sp = 0, cast = 0;
  Block& l = blocks_[static_cast<std::size_t>(laserSlot)];
  stack[static_cast<std::size_t>(sp++)] = Seg{l.x, l.y, angleDeg, len, 0, {}};
  while (sp > 0) {
    const Seg seg = stack[static_cast<std::size_t>(--sp)];
    const bool first = cast++ == 0;
    const double angle = seg.angle * kDegToRad;
    const double x1 = seg.x0 + dmath::cos(angle) * seg.len, y1 = seg.y0 + dmath::sin(angle) * seg.len;
    double stop = 1.0, t = 0.0;
    int prism = -1;
    std::bitset<kMaxBlocks> seen;  // blockers already dealt with on this beam
    for (;;) {  // the nearest blocker not yet seen
      int best = -1; double bestT = 2.0;
      for (int i = 0; i < orderCount_; ++i) {
        const int s = order_[i];
        const Block& v = blocks_[s];
        if ((v.kind() != BlockKind::Void && v.kind() != BlockKind::Path && !(v.kind() == BlockKind::Gate && !gateOpen(v))) || seen[static_cast<std::size_t>(s)]) continue;
        if (segmentPolygonFirstHit(seg.x0, seg.y0, x1, y1, v.info().outline, v.info().outlineCount, v.x, v.y, t) && t < bestT) { best = s; bestT = t; }
      }
      if (best < 0) break;
      seen.set(static_cast<std::size_t>(best));
      Block& g = blocks_[static_cast<std::size_t>(best)];
      if (g.kind() == BlockKind::Void || g.kind() == BlockKind::Gate) { stop = bestT; break; }  // a closed Gate is a Void
      if (g.type == BlockType::PowerPrism) {
        bool been = seg.depth >= kMaxPrismDepth;
        for (int d = 0; d < seg.depth && !been; ++d) been = seg.via[static_cast<std::size_t>(d)] == best;
        if (been) continue;  // straight through
        stop = bestT; prism = best;
        break;
      }
    }
    if (first) firstStop = stop;
    const double ex = seg.x0 + (x1 - seg.x0) * stop, ey = seg.y0 + (y1 - seg.y0) * stop;
    for (int i = 0; i < orderCount_; ++i) {
      const int s = order_[i];
      if (s == laserSlot) continue;
      const Block& b = blocks_[s];
      if (!isSourceSide(b.kind()) && b.kind() != BlockKind::Logic && !gapsOnHit(b)) continue;
      if (segmentPolygonFirstHit(seg.x0, seg.y0, ex, ey, b.info().outline, b.info().outlineCount, b.x, b.y, t)) hits.set(static_cast<std::size_t>(s));
    }
    if (beamCount_ < kMaxBeams) beams_[static_cast<std::size_t>(beamCount_++)] = Beam{l.id, seg.x0, seg.y0, ex, ey};
    if (prism < 0) continue;
    const Block& p = blocks_[static_cast<std::size_t>(prism)];
    const int streams = std::clamp(static_cast<int>(std::lround(p.params[P::PowerPrism::streams])), 1, 4);
    const double spread = std::clamp(p.params[P::PowerPrism::spread], 0.0, 360.0), left = seg.len * (1.0 - stop);
    for (int k = streams - 1; k >= 0 && sp < kMaxBeamSegments && cast + sp < kMaxBeamSegments; --k) {  // pushed last-first: cast in order
      Seg child{p.x, p.y, p.params[P::PowerPrism::angle] + (streams > 1 ? spread * (static_cast<double>(k) / (streams - 1) - 0.5) : 0.0), left, seg.depth + 1, seg.via};
      child.via[static_cast<std::size_t>(seg.depth)] = static_cast<std::int16_t>(prism);
      stack[static_cast<std::size_t>(sp++)] = child;
    }
  }
}

/// A synced emitter's slot on the beat grid at `beat`: it emits when this changes (CHG-0004 3.5).
std::int64_t Engine::beatSlotAt(const Block& e, double beat) noexcept {
  const double div = std::max(1.0 / 64.0, e.params[P::PowerEmitter::division]);
  // Offset (CHG-0014): the whole grid is late by a fraction of a division. 0 leaves the beat untouched (v1 timing).
  if (const double offset = std::clamp(e.params[P::PowerEmitter::offset], 0.0, 1.0); offset > 0.0) beat -= offset * div;
  auto slot = static_cast<std::int64_t>(std::floor(beat / div + 1e-9));
  // Swing (owner): the second of each pair of slots fires late, by up to a third of a division (triplet shuffle).
  if (const double swing = std::clamp(e.params[P::PowerEmitter::swing], 0.0, 1.0); swing > 0.0) {
    const auto pair = static_cast<std::int64_t>(std::floor(beat / (2.0 * div) + 1e-9));
    const double within = beat - static_cast<double>(pair) * 2.0 * div;
    slot = pair * 2 + (within + 1e-9 >= div * (1.0 + swing / 3.0) ? 1 : 0);
  }
  return slot;
}

/// The DAW's transport started at `beat` (owner review 2): nothing from before carries over, so every take from the
/// same position plays the same. Particles in flight and pulses end; emitters start their timing again (synced ones
/// fire on the next grid slot, or at once when `beat` is on one; free ones as when just added). Synced lasers follow
/// the beat; lasers with Restart start again from their Angle.
void Engine::resyncToTransport(double beat) noexcept {
  particleCount_ = 0;
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    b.pulsePower = 0;
    b.pulseDelayCount = 0;
    b.counterStep = 0;
    b.counterFired = false;
    b.laserTurning = false;  // a Laser with Restart starts the take from its Angle (R9a)
    if (b.type != BlockType::PowerEmitter) continue;
    b.beatSlot = beatSlotAt(b, beat - 1e-6);  // just before: a start on a grid slot fires at once
    b.emitCounter = 0;  // as when added (v1 ParticleEmitter.Init)
  }
  recomputeStaticPower();  // Counters and Chances are off again (R2c, R2d)
  updateGates();
}

void Engine::runTick() noexcept {
  // 0. musical time (SIMULATION-0003): beat_ is the position at this tick; the next tick is 1/kTickRate s later.
  struct Advance { double& beat; double bpm; ~Advance() { beat += bpm / 60.0 / kTickRate; } } advance{beat_, tempo_};
  // 0a. LFOs move their targets (CHG-0018), before anything reads them this tick
  runModulators();
  // 0b. keys held on an Emitter/Laser whose keyboard moved away power it no more
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if (b.keyPower == 0) continue;
    bool kept = false;
    const auto row = graph_.row(order_[k]);
    for (int j = 0; j < orderCount_ && !kept; ++j) kept = row[order_[j]] && blocks_[order_[j]].kind() == BlockKind::Controller;
    if (!kept) { b.keyCount = 0; b.keyPower = 0; }
  }
  // 1. expire pulses that end at this tick
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    int n = 0;
    for (int i = 0; i < b.pulsePower; ++i) if (b.pulseEndTick[i] != tick_) b.pulseEndTick[n++] = b.pulseEndTick[i];
    b.pulsePower = n;
  }
  // 1a. Pulses whose waits end at this tick fire (R2b), in creation order, before the emitters and lasers they power run
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if (b.pulseDelayCount == 0) continue;
    int n = 0, due = 0;
    for (int i = 0; i < b.pulseDelayCount; ++i) {
      const auto t = b.pulseFireTick[static_cast<std::size_t>(i)];
      if (t == tick_) ++due; else b.pulseFireTick[static_cast<std::size_t>(n++)] = t;
    }
    b.pulseDelayCount = n;
    for (int i = 0; i < due; ++i) firePulse(b);
  }
  // 2. emitters (v1 ParticleEmitter.Update, frame counts scaled to ticks)
  for (int k = 0; k < orderCount_; ++k) {
    Block& e = blocks_[order_[k]];
    if (e.type != BlockType::PowerEmitter) continue;
    const bool running = worldPower_ && (e.params[P::PowerEmitter::selfPoweredMode] != 0.0 || e.power() > 0);
    const bool synced = e.params[P::PowerEmitter::sync] != 0.0;
    // A key pressed since the last tick (CHG-0009): it fires once, now, and the repeat starts over.
    if (e.keyPressed) {
      e.keyPressed = false;
      if (worldPower_) {
        emit(e);
        e.emitCounter = 0;
        if (synced) e.beatSlot = beatSlotAt(e, beat_);
        continue;
      }
    }
    auto fire = [this](Block& b) { emit(b); };
    // Struck again while hits hold it (SIMULATION-0012): it fires now, and its timing starts over (as a key press).
    if (e.restrike) {
      e.restrike = false;
      if (running) {
        fire(e);
        e.emitCounter = 0;
        if (synced) e.beatSlot = beatSlotAt(e, beat_);
        continue;
      }
    }
    if (synced) {
      // Synced (CHG-0004 3.5): emit when the beat crosses the next multiple of `division` (song grid in the plugin).
      const auto slot = beatSlotAt(e, beat_);
      // Starting (or re-synced, or turned on) mid-slot: v1 fires at once when powered, as the unsynced counter does.
      if (running && slot != e.beatSlot) fire(e);
      e.beatSlot = slot;
      if (!running) e.beatSlot = std::numeric_limits<std::int64_t>::min();
      continue;
    }
    const int rateTicks = std::max(1, static_cast<int>(std::lround(e.params[P::PowerEmitter::rate]))) * kTicksPerV1Frame;
    // Unpowered, the counter is primed so it fires at once when powered; Offset (CHG-0014) makes it wait that fraction
    // of the interval first.
    if (!running) { e.emitCounter = rateTicks - static_cast<int>(std::lround(std::clamp(e.params[P::PowerEmitter::offset], 0.0, 1.0) * rateTicks)); continue; }
    if (++e.emitCounter >= rateTicks) { fire(e); e.emitCounter = 0; }
  }
  // 2a. Prisms turn (CHG-0015): Rotate as the Laser's, whenever the world is on (a Prism needs no power).
  if (worldPower_) for (int k = 0; k < orderCount_; ++k) {
    Block& pr = blocks_[order_[k]];
    if (pr.type != BlockType::PowerPrism || std::lround(pr.params[P::PowerPrism::rotate]) == 0) continue;
    double a = pr.params[P::PowerPrism::angle] + pr.params[P::PowerPrism::rotate] / 100.0 / kTicksPerV1Frame;
    if (a > 90.0) a -= 360.0;
    if (a < -270.0) a += 360.0;
    pr.params[P::PowerPrism::angle] = a;
  }
  // 2a'. Sound Lasers (CHG-0016, R7b): on while the level heard is past the threshold (or under it, inverted), and for
  // at least `hold` after.
  for (int k = 0; k < orderCount_; ++k) {
    Block& l = blocks_[order_[k]];
    if (l.type != BlockType::PowerSoundLaser) continue;
    const double db = l.listenEnv > 1e-6 ? 20.0 * dmath::log10(l.listenEnv) : -120.0;
    const bool above = db > l.params[P::PowerSoundLaser::threshold];
    const bool want = l.poolIndex >= 0 && (l.params[P::PowerSoundLaser::invert] != 0.0 ? !above : above);
    if (want) l.holdUntil = tick_ + static_cast<std::uint32_t>(std::lround(std::clamp(l.params[P::PowerSoundLaser::hold], 0.0, 10.0) * kTickRate));
    l.listenOn = want || tick_ < l.holdUntil;
    l.mon[0] = static_cast<float>(db); l.mon[1] = l.listenOn ? 1.0f : 0.0f;
  }
  // 2b. lasers (v1 LaserBeams.UpdateCollisions)
  runLasers();
  // 3. particles: age, collide at current position (topmost block first), then move (v1 ParticleLayer order)
  // R5b (owner, 2026-11-11; SIMULATION-0004): another emitter catches a particle and fires one at once. Those fire
  // after this pass (in hit order), so a new particle starts moving next tick, as an emitter's own do.
  int kept = 0, caughtCount = 0;
  std::array<int, kMaxParticles> caught;  // block slots, filled before read
  struct SplitHit { int slot; double speed; int life; };
  std::array<SplitHit, 256> splits;  // Prisms entered this tick, filled before read
  int splitCount = 0;
  for (int i = 0; i < particleCount_; ++i) {
    Particle p = particles_[i];
    if (--p.life < 1) { continue; }
    bool consumed = false;
    for (int k = orderCount_ - 1; k >= 0 && !consumed; --k) {
      Block& b = blocks_[order_[k]];
      if (b.type == BlockType::PowerEmitter) {
        // Only a particle that came in from outside: not its own emitter's, nor one born inside overlapping emitters
        // (which would pass it back and forth every tick).
        if (p.fresh) continue;
        const auto& inf = b.info();
        if (!pointInPolygon(p.x, p.y, inf.outline, inf.outlineCount, b.x, b.y)) continue;
        if (pointInPolygon(p.x - p.vx, p.y - p.vy, inf.outline, inf.outlineCount, b.x, b.y)) continue;
        consumed = true;
        log(Event::Type::Hit, b.id);
        caught[static_cast<std::size_t>(caughtCount++)] = order_[k];
        continue;
      }
      const BlockKind kind = b.kind();
      if (kind == BlockKind::Path) {
        // R5d (CHG-0015): a Prism turns a particle into its streams as it enters (as an emitter catches one, R5b), sent
        // off after this pass.
        if (p.fresh) continue;
        const auto& inf = b.info();
        if (!pointInPolygon(p.x, p.y, inf.outline, inf.outlineCount, b.x, b.y)) continue;
        if (pointInPolygon(p.x - p.vx, p.y - p.vy, inf.outline, inf.outlineCount, b.x, b.y)) continue;
        consumed = true;
        log(Event::Type::Split, b.id);
        if (splitCount < static_cast<int>(splits.size())) splits[static_cast<std::size_t>(splitCount++)] = {order_[k], std::sqrt(p.vx * p.vx + p.vy * p.vy), p.life};
        continue;
      }
      const bool absorbs = kind == BlockKind::Void || (kind == BlockKind::Gate && !gateOpen(b));  // R5c: a closed Gate
      const bool gaps = gapsOnHit(b);
      const bool reacts = isSourceSide(kind) || kind == BlockKind::Logic || gaps;
      if (!absorbs && !reacts) continue;
      const auto& inf = b.info();
      if (!pointInPolygon(p.x, p.y, inf.outline, inf.outlineCount, b.x, b.y)) continue;
      consumed = true;
      if (absorbs) log(Event::Type::Absorb, b.id);
      else if (gaps) { log(Event::Type::Hit, b.id); powerGap(b); }
      else { log(Event::Type::Hit, b.id); particleHit(b); }
    }
    if (consumed) continue;
    p.x += p.vx; p.y += p.vy; p.fresh = false;
    particles_[kept++] = p;
  }
  particleCount_ = kept;
  for (int i = 0; i < caughtCount; ++i) emit(blocks_[caught[static_cast<std::size_t>(i)]]);
  // R5d: each Prism entered sends out its streams from its centre, at the particle's speed and with the life it had
  // left (so loops between Prisms die out, SIMULATION-0006). When the pool is full the rest are dropped.
  for (int i = 0; i < splitCount; ++i) {
    const SplitHit& h = splits[static_cast<std::size_t>(i)];
    const Block& pr = blocks_[static_cast<std::size_t>(h.slot)];
    const int streams = std::clamp(static_cast<int>(std::lround(pr.params[P::PowerPrism::streams])), 1, 4);
    const double spread = std::clamp(pr.params[P::PowerPrism::spread], 0.0, 360.0);
    for (int k = 0; k < streams && particleCount_ < kMaxParticles; ++k) {
      const double a = (pr.params[P::PowerPrism::angle] + (streams > 1 ? spread * (static_cast<double>(k) / (streams - 1) - 0.5) : 0.0)) * kDegToRad;
      Particle& np = particles_[particleCount_++];
      np.x = pr.x; np.y = pr.y;
      np.vx = dmath::cos(a) * h.speed; np.vy = dmath::sin(a) * h.speed;
      np.life = h.life; np.size = 2.0f + rng_.nextFloat(); np.fresh = true;
    }
  }
  // 3b. Powers whose gap is over give power again (owner, 2026-11-14)
  {
    bool ended = false;
    for (int k = 0; k < orderCount_; ++k) { Block& b = blocks_[order_[k]]; if (b.gapUntil != 0 && tick_ >= b.gapUntil) { b.gapUntil = 0; ended = true; } }
    if (ended) recomputeStaticPower();
  }
  // 4. gates follow power
  updateGates();
  // 5. Arpeggiators step (CHG-0017)
  stepArps();
}

/// Power (Power, Toggle, pulses, lasers, a press) holds the source's mono voice at the default note, as v1's
/// AddPower → NoteOn("power"); losing it releases that voice unless a controller took it over.
void Engine::updateGates() noexcept {
  for (int k = 0; k < orderCount_; ++k) {
    Block& b = blocks_[order_[k]];
    if (b.kind() != BlockKind::AudioSource) continue;
    const bool want = b.sourcePower() > 0;
    if (b.restrike) { b.restrike = false; if (want && b.powerOn) { restrike(order_[k]); continue; } }
    if (want == b.powerOn) continue;
    b.powerOn = want;
    if (b.type == BlockType::SourceStage) {  // CHG-0021: power is the inner world's power switch
      log(want ? Event::Type::GateOn : Event::Type::GateOff, b.id);
      if (Engine* inner = b.poolIndex >= 0 ? stages_[static_cast<std::size_t>(b.poolIndex)] : nullptr) inner->applyNow(Command::worldPower(want, -1, keepsParticles(b)));
      continue;
    }
    if (b.arranged) { arrange(order_[k], want); continue; }  // CHG-0017: power plays the notes the source is given
    // v1 rule (Source/ConnectionManager): a Power-held source always plays the default envelope (Power triggers
    // before the chain's Envelope block applies its settings); particle, pulse, laser, press and key triggers use it.
    if (want) voiceOn(order_[k], 0, -1, false, 0.0, b.staticPower == 0);
    else voiceOff(order_[k], 0, -1);
  }
}

}  // namespace blokdust
