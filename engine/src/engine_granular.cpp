// Engine: Granular voices, and the readouts the UI draws (monitors, playheads).
#include "engine_internal.hpp"

namespace blokdust {

/// v1 Granular.GrainLoop on 12 Tone.SimplePlayers with AmplitudeEnvelopes, sample-accurate: while the block plays
/// (powered or a note held), a grain starts every grainlength × 3 / density s (v1's setTimeout of
/// round(grainlength × 2 / density × 1500) ms) at region ± spread/2 (uniform, clamped to [0, duration − grainlength]),
/// cycling through `density` players. Each grain plays at the note's playback rate; its envelope rises over 40% of the
/// grain length (v1 _RampLength), holds, and releases over the last 40%. The sum goes through the lead voice's envelope.
/// MPE (PLUGIN-0004): pressure scales the volume; slide places the grains (0 = start … 1 = end of the file).
void Engine::renderGranular(Block& b, int n) noexcept {
  const auto& p = b.params;
  Voice* lead = nullptr;
  for (auto& vo : b.voices) if (vo.env.active() && (!lead || vo.activeAt > lead->activeAt)) lead = &vo;
  for (auto& vo : b.voices) if (&vo != lead && vo.env.active()) for (int i = 0; i < n; ++i) vo.env.next();
  if (!lead) { for (auto& g : b.grains) g.on = false; return; }
  const double gl = std::clamp(p[P::SourceGranular::grainlength], 0.01, 2.0);
  const int density = std::clamp(static_cast<int>(std::lround(p[P::SourceGranular::density])), 1, static_cast<int>(b.grains.size()));
  const double dur = b.sampleFrames > 0 ? b.sampleFrames / b.sampleRate : 0.0;
  const int interval = std::max(1, static_cast<int>(std::lround(std::round(gl * 2.0 / density * 1500.0) / 1000.0 * sampleRate_)));
  const int len = std::max(4, static_cast<int>(std::lround(gl * sampleRate_)));
  const int attack = std::max(1, static_cast<int>(std::lround(gl * 0.4 * sampleRate_)));
  const int releaseAt = static_cast<int>(std::lround(gl * 0.6 * sampleRate_));
  const int release = std::max(1, len - releaseAt);
  for (int i = 0; i < n; ++i) {
    if (lead->active && b.sampleL && dur > gl && --b.grainTimer <= 0) {
      b.grainTimer = interval;
      Block::Grain& g = b.grains[static_cast<std::size_t>(b.grainIndex)];
      b.grainIndex = (b.grainIndex + 1) % density;
      const double centre = lead->slide >= 0.0 ? lead->slide * dur : p[P::SourceGranular::region];
      const double spread = std::max(0.0, p[P::SourceGranular::spread]);
      const double at = std::clamp(centre - spread * 0.5 + b.grainRng.nextFloat() * spread, 0.0, dur - gl);
      // v1 Granular.SetPitch: the next grains take the new note's rate at once (no glide), the sounding ones keep theirs.
      g.on = true; g.pos = at * b.sampleRate; g.rate = lead->glideLeft > 0 ? lead->glideTo : lead->pitch; g.age = 0; g.len = len;
    }
    // A glide set by a keyboard runs on (its voice's pitch arrives) though grains do not glide (owner bug 2026-11-14:
    // without this the pitch never left the first note).
    for (auto& vo : b.voices) if (vo.glideLeft > 0) vo.pitch = --vo.glideLeft ? vo.pitch + vo.glideStep : vo.glideTo;
    double sum = 0.0;
    for (auto& g : b.grains) {
      if (!g.on) continue;
      const double e = g.age < attack ? static_cast<double>(g.age) / attack : g.age < releaseAt ? 1.0 : std::max(0.0, 1.0 - static_cast<double>(g.age - releaseAt) / release);
      const double pos = std::min(g.pos, static_cast<double>(b.sampleFrames) - 1.0);
      const auto k = static_cast<std::uint32_t>(pos);
      const double f = pos - k;
      const std::uint32_t k1 = std::min<std::uint32_t>(k + 1, b.sampleFrames - 1);
      const double sl = b.sampleL[k] + f * (b.sampleL[k1] - b.sampleL[k]), sr = b.sampleR[k] + f * (b.sampleR[k1] - b.sampleR[k]);
      sum += 0.5 * (sl + sr) * e;
      g.pos += g.rate;
      if (++g.age >= g.len || g.pos >= b.sampleFrames - 1) g.on = false;
    }
    const double env = lead->env.next();
    chainL_[i] += static_cast<float>(sum * env * kSourceGain * glideGain(*lead));
  }
}
int Engine::monitors(Monitor* out, int max) const noexcept {
  int n = 0;
  for (int k = 0; k < orderCount_ && n < max; ++k) {
    const Block& b = blocks_[order_[k]];
    if (b.type == BlockType::FxCompressor) out[n++] = {b.id, {b.mon[0], b.mon[1], b.mon[2], b.mon[3]}};
    else if (b.type == BlockType::FxLfo) out[n++] = {b.id, {b.mon[0], b.mon[1], b.mon[2], 0.0f}};
    else if (b.type == BlockType::PowerSoundLaser) out[n++] = {b.id, {b.mon[0], b.mon[1], 0.0f, 0.0f}};
    else if (b.type == BlockType::PowerChance) out[n++] = {b.id, {0.0f, b.counterFired ? 1.0f : 0.0f, 0.0f, 0.0f}};
    else if (b.type == BlockType::PowerCounter) out[n++] = {b.id, {static_cast<float>(b.counterStep), b.counterFired ? 1.0f : 0.0f, 0.0f, 0.0f}};
    else if (b.type == BlockType::PowerGate) out[n++] = {b.id, {gateOpen(b) ? 1.0f : 0.0f, 0.0f, 0.0f, 0.0f}};
    else if (b.type == BlockType::FxRandomNote || b.type == BlockType::FxChord) out[n++] = {b.id, {b.mon[0], b.mon[1], 0.0f, 0.0f}};
    else if (b.type == BlockType::PowerPrism) out[n++] = {b.id, {static_cast<float>(b.params[P::PowerPrism::angle]), 0.0f, 0.0f, 0.0f}};
  }
  return n;
}
int Engine::playheads(Playhead* out, int max) const noexcept {
  int n = 0;
  for (int k = 0; k < orderCount_ && n < max; ++k) {
    const Block& b = blocks_[order_[k]];
    if (!b.sampleL || b.sampleFrames == 0 || b.sampleRate <= 0.0) continue;
    if (isSampler(b.type)) {
      for (const auto& vo : b.voices)
        if (vo.samplePlaying && vo.env.active() && n < max) out[n++] = {b.id, static_cast<float>(vo.playhead / b.sampleRate)};
    } else if (b.type == BlockType::SourceGranular) {
      for (const auto& g : b.grains)
        if (g.on && n < max) out[n++] = {b.id, static_cast<float>(g.pos / b.sampleRate)};
    }
  }
  return n;
}

}  // namespace blokdust
