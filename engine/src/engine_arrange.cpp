// Engine: note effects (Random Note, Chord, Arpeggiator) and Keys set pitch: arranged sources.
#include "engine_internal.hpp"

namespace blokdust {

// ---------------------------------------------------------------------------------------------------------------
// arranged sources (CHG-0017, AUDIO-0002): note effects and Keys set pitch
// ---------------------------------------------------------------------------------------------------------------

namespace {
/// Chord qualities (CHG-0040, R10f), bottom to top: none, sus2, minor, major, sus4, minor 7th, 7th, major 7th.
constexpr int kChordCount = 8;
constexpr int kChordSize[kChordCount] = {1, 3, 3, 3, 3, 4, 4, 4};
constexpr int kChords[kChordCount][4] = {{0, 0, 0, 0}, {0, 2, 7, 0}, {0, 3, 7, 0}, {0, 4, 7, 0}, {0, 5, 7, 0}, {0, 3, 7, 10}, {0, 4, 7, 10}, {0, 4, 7, 11}};
/// Random Note's range (MIDI): C1…B7.
constexpr int kRandomLow = 24, kRandomHigh = 107;
/// A source's own tuning in whole semitones (its Note or playback rate), so a Chord picks by the note heard.
int tuningOf(const Block& b) noexcept {
  if (b.type == BlockType::SourceTone) return static_cast<int>(std::lround(b.params[P::SourceTone::transpose]));
  if (b.type == BlockType::SourceWavetable) return static_cast<int>(std::lround(b.params[P::SourceWavetable::transpose]));
  if (b.type == BlockType::SourceSample || b.type == BlockType::SourceGranular) return static_cast<int>(std::lround(b.params[P::SourceSample::playbackRate]));
  return 0;
}
/// Random Note's pick (R10h): every note in its range, weighted by its note's bar after Key; `fallback` when no note
/// has weight.
int pickRandom(Block& rn, int fallback) noexcept {
  namespace R = P::FxRandomNote;
  const int key = ((static_cast<int>(std::lround(rn.params[R::key])) % 12) + 12) % 12;
  int lo = std::clamp(static_cast<int>(std::lround(rn.params[R::low])), kRandomLow, kRandomHigh);
  int hi = std::clamp(static_cast<int>(std::lround(rn.params[R::high])), kRandomLow, kRandomHigh);
  if (hi < lo) std::swap(lo, hi);
  const auto weight = [&](int m) { return std::clamp(rn.params[static_cast<std::size_t>(R::w0 + (m % 12 - key + 12) % 12)], 0.0, 1.0); };
  double total = 0.0;
  for (int m = lo; m <= hi; ++m) total += weight(m);
  if (!(total > 0.0)) return fallback;
  double r = static_cast<double>(rn.grainRng.next()) * (1.0 / 4294967296.0) * total;
  int last = fallback;
  for (int m = lo; m <= hi; ++m) {
    const double w = weight(m);
    if (w <= 0.0) continue;
    last = m;
    if ((r -= w) < 0.0) return m;
  }
  return last;
}
/// The panel's light-up (UI-0016): the note a Random Note picked or a Chord voiced, and how many so far.
void noteShown(Block& fx, int midi) noexcept {
  fx.mon[0] = static_cast<float>(((midi % 12) + 12) % 12);
  fx.mon[1] += 1.0f;
}
}  // namespace

bool Engine::keysSetPitch(const Block& ctrl) const noexcept {
  if (ctrl.type == BlockType::InputStageIn) return outsideKeys_.pitchOnly;
  if (ctrl.type == BlockType::InputComputerKeyboard) return ctrl.params[P::InputComputerKeyboard::keysSetPitch] != 0.0;
  if (ctrl.type == BlockType::InputMidiController) return ctrl.params[P::InputMidiController::keysSetPitch] != 0.0;
  if (ctrl.type == BlockType::InputTouchpad) return ctrl.params[P::InputTouchpad::keysSetPitch] != 0.0;
  return false;
}

/// The note effects in a source's chain (the last of each kind in chain order, as the Envelope).
Engine::NoteFx Engine::noteFxFor(int slot) const noexcept {
  NoteFx fx;
  const int c = chains_.chainOf[static_cast<std::size_t>(slot)];
  if (c < 0) return fx;
  const auto r = chains_.chains[static_cast<std::size_t>(c)];
  for (int m = 0; m < r.count; ++m) {
    const int s = chains_.members[r.start + m];
    const BlockType t = blocks_[static_cast<std::size_t>(s)].type;
    if (t == BlockType::FxRandomNote) fx.random = s; else if (t == BlockType::FxChord) fx.chord = s; else if (t == BlockType::FxArpeggiator) fx.arp = s;
  }
  return fx;
}

/// A source is arranged while a note effect is in its chain or a connected keyboard has Keys set pitch on. Otherwise
/// v1's voice rules apply untouched.
bool Engine::wantsArranged(int slot) const noexcept {
  const NoteFx fx = noteFxFor(slot);
  if (fx.random >= 0 || fx.chord >= 0 || fx.arp >= 0) return true;
  const auto& row = graph_.row(slot);
  for (int k = 0; k < orderCount_; ++k) if (row[order_[k]] && blocks_[order_[k]].kind() == BlockKind::Controller && keysSetPitch(blocks_[order_[k]])) return true;
  return false;
}

/// A controller's key on an arranged source: it joins or leaves the held keys; pressing a sounding key is a trigger.
void Engine::arrangedKey(int slot, const Block& ctrl, int key, int channel, bool on) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  int n = 0;
  for (int i = 0; i < b.arrKeyCount; ++i) {
    const auto& h = b.arrKeys[static_cast<std::size_t>(i)];
    if (h.key != key || h.controller != ctrl.id || h.channel != channel) b.arrKeys[static_cast<std::size_t>(n++)] = h;
  }
  const bool pitchOnly = keysSetPitch(ctrl);
  if (on) {
    if (n == static_cast<int>(b.arrKeys.size())) { std::copy(b.arrKeys.begin() + 1, b.arrKeys.end(), b.arrKeys.begin()); --n; }
    b.arrKeys[static_cast<std::size_t>(n++)] = {static_cast<std::int16_t>(key), static_cast<std::int16_t>(channel), ctrl.id, pitchOnly, polyOf(ctrl)};
  }
  b.arrKeyCount = n;
  arrange(slot, on && !pitchOnly, true);
  updateNotePower(b);
}

/// Work out the notes an arranged source should be sounding and make its voices match (AUDIO-0002).
/// Notes in: the keys held on its keyboards (a mono keyboard that sounds counts only its newest; with Keys set pitch
/// every held key counts), or, with none, the source's own note. They sound while the source has power or a sounding
/// key is held. Then Random Note picks a note for each (CHG-0040), Chord plays each note's chord, and an Arpeggiator
/// plays one at a time. `trigger`: power arrived, a hit, or (`keyPress`) a sounding key was pressed.
void Engine::arrange(int slot, bool trigger, bool keyPress) noexcept {
  Block& b = blocks_[static_cast<std::size_t>(slot)];
  using Note = Block::ArrNote;
  bool soundingKey = false;
  for (int i = 0; i < b.arrKeyCount; ++i) soundingKey = soundingKey || !b.arrKeys[static_cast<std::size_t>(i)].pitchOnly;
  const bool gate = b.powerOn || soundingKey;
  const bool started = gate && !b.arrGate;
  b.arrGate = gate;
  if (!gate) {
    for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) releaseVoice(slot, v);
    b.randomValid = false;
    return;
  }
  const NoteFx fx = noteFxFor(slot);
  std::array<Note, 64> notes;
  int n = 0;
  for (int i = 0; i < b.arrKeyCount; ++i) {
    const auto& h = b.arrKeys[static_cast<std::size_t>(i)];
    if (!h.pitchOnly && !h.poly) {  // a sounding mono keyboard: only its newest key
      bool newer = false;
      for (int j = i + 1; j < b.arrKeyCount; ++j) newer = newer || (b.arrKeys[static_cast<std::size_t>(j)].controller == h.controller && !b.arrKeys[static_cast<std::size_t>(j)].pitchOnly);
      if (newer) continue;
    }
    notes[static_cast<std::size_t>(n++)] = Note{h.controller, h.key, h.channel, 0.0, h.bend, static_cast<std::int16_t>(i)};
  }
  const bool fromKeys = n > 0;
  if (!fromKeys) notes[static_cast<std::size_t>(n++)] = Note{};  // the source's own note
  if (fx.random >= 0) {
    // R10h: keys only trigger. Each held key keeps its own pick until a trigger other than a key press (power, a
    // hit) picks again for all; the source's own note picks at each trigger.
    Block& rn = blocks_[static_cast<std::size_t>(fx.random)];
    if (fromKeys) {
      const bool all = trigger && !keyPress;
      for (int i = 0; i < n; ++i) {
        Note& x = notes[static_cast<std::size_t>(i)];
        auto& h = b.arrKeys[static_cast<std::size_t>(x.src)];
        if (all || h.rnd < 0) { h.rnd = static_cast<std::int16_t>(pickRandom(rn, h.key)); noteShown(rn, h.rnd); }
        x.offset = static_cast<double>(h.rnd - h.key);
      }
    } else {
      if (trigger || !b.randomValid) {
        const int m = pickRandom(rn, -1);
        b.randomNote = m < 0 ? Note{} : Note{0, static_cast<std::int16_t>(m), 0, 0.0};
        b.randomValid = true;
        noteShown(rn, m < 0 ? 60 : m);
      }
      notes[0] = b.randomNote;
    }
  }
  if (fx.chord >= 0) {
    // R10f: each note in plays the chord on its own note's bar (after Key). Smooth: the note in stays and the others
    // go to the octave nearest the previous chord's notes, within an octave of it. A note's voicing is kept while its
    // root and chord stay, so arranging again never moves a sounding chord.
    namespace C = P::FxChord;
    Block& ch = blocks_[static_cast<std::size_t>(fx.chord)];
    const int key = ((static_cast<int>(std::lround(ch.params[C::key])) % 12) + 12) % 12, tuning = tuningOf(b);
    const bool smooth = ch.params[C::smooth] != 0.0;
    std::array<Note, 64> out;
    int m = 0;
    for (int i = 0; i < n; ++i) {
      const Note& x = notes[static_cast<std::size_t>(i)];
      Block::Voicing& vc = x.src >= 0 ? b.arrKeys[static_cast<std::size_t>(x.src)].voicing : b.ownVoicing;
      const int root = static_cast<int>(std::lround((x.key >= 0 ? x.key : 60) + x.offset));
      const int pc = (((root + tuning) % 12) + 12) % 12;
      const int q = std::clamp(static_cast<int>(std::lround(ch.params[static_cast<std::size_t>(C::q0 + (pc - key + 12) % 12)])), 0, kChordCount - 1);
      const int tag = q + (smooth ? kChordCount : 0);
      if (vc.root != root || vc.quality != tag) {
        vc.root = static_cast<std::int16_t>(root); vc.quality = static_cast<std::int8_t>(tag); vc.count = static_cast<std::int8_t>(kChordSize[q]);
        for (int k = 0; k < kChordSize[q]; ++k) {
          int best = kChords[q][k];
          if (smooth && k > 0 && b.lastChordCount > 0) {
            double bestD = 1e9;
            for (int c = kChords[q][k] - 24; c <= kChords[q][k] + 12; c += 12) {
              if (c < -12 || c > 12) continue;
              double d = 1e9;
              for (int j = 0; j < b.lastChordCount; ++j) d = std::min(d, std::abs(root + c - b.lastChord[static_cast<std::size_t>(j)]));
              if (d < bestD || (d == bestD && std::abs(c - kChords[q][k]) < std::abs(best - kChords[q][k]))) { bestD = d; best = c; }
            }
          }
          vc.off[static_cast<std::size_t>(k)] = static_cast<std::int8_t>(best);
        }
        noteShown(ch, root + tuning);
        if (vc.count > 1) {  // a chord (not a lone note) is what the next one leads from
          b.lastChordCount = vc.count;
          for (int k = 0; k < vc.count; ++k) b.lastChord[static_cast<std::size_t>(k)] = root + vc.off[static_cast<std::size_t>(k)];
        }
      }
      for (int k = 0; k < vc.count && m < static_cast<int>(out.size()); ++k) {
        Note y = x;
        y.offset += vc.off[static_cast<std::size_t>(k)];
        out[static_cast<std::size_t>(m++)] = y;
      }
    }
    notes = out; n = m;
  }
  const auto pitchOf = [](const Note& x) { return (x.key >= 0 ? x.key : 60) + x.offset + x.bend; };
  if (fx.arp >= 0) {
    Block& ar = blocks_[static_cast<std::size_t>(fx.arp)];
    const bool perHit = ar.params[P::FxArpeggiator::perHit] != 0.0;
    // Timed: a fresh start begins at its first note, on the beat it is in. Per hit: every trigger is the next note.
    // While it runs on its own, keys and hits change the notes but not where it is.
    const bool advance = perHit ? trigger : arpTick_;
    if (started && !perHit) { b.arpStep = 0; b.arpTicks = -1;  /* this tick's stepArps makes it 0 */ b.arpRand = ar.grainRng.next(); b.arpSlot = static_cast<std::int64_t>(std::floor(beat_ / std::max(1.0 / 64.0, ar.params[P::FxArpeggiator::division]) + 1e-9)); }
    else if (advance) { ++b.arpStep; b.arpRand = ar.grainRng.next(); }
    std::sort(notes.begin(), notes.begin() + n, [&](const Note& x, const Note& y) { return pitchOf(x) < pitchOf(y); });
    const int octaves = std::clamp(static_cast<int>(std::lround(ar.params[P::FxArpeggiator::octaves])), 1, 3);
    const int base = n;
    for (int o = 1; o < octaves; ++o) for (int i = 0; i < base && n < static_cast<int>(notes.size()); ++i) {
      Note x = notes[static_cast<std::size_t>(i)]; x.offset += 12.0 * o; notes[static_cast<std::size_t>(n++)] = x;
    }
    const int pattern = std::clamp(static_cast<int>(std::lround(ar.params[P::FxArpeggiator::pattern])), 0, 3);
    const int step = std::max(0, b.arpStep);
    int at = step % n;
    if (pattern == 1) at = n - 1 - at;
    else if (pattern == 2 && n > 1) { const int p = step % (2 * n - 2); at = p < n ? p : 2 * n - 2 - p; }
    else if (pattern == 3) at = static_cast<int>(b.arpRand % static_cast<std::uint32_t>(n));
    notes[0] = notes[static_cast<std::size_t>(at)]; n = 1;
    if (advance) for (int v = 0; v < kVoices; ++v) if (b.voices[static_cast<std::size_t>(v)].active) releaseVoice(slot, v);  // each step is struck again
  }
  n = std::min(n, b.voiceCount);
  // Voices no longer wanted let go; notes not yet sounding start. Notes that stay keep sounding as they are.
  const auto same = [](const Voice& vo, const Note& x) { return vo.controller == x.controller && vo.key == x.key && vo.channel == x.channel && vo.offset == x.offset; };
  for (int v = 0; v < kVoices; ++v) {
    const Voice& vo = b.voices[static_cast<std::size_t>(v)];
    if (!vo.active) continue;
    bool wanted = false;
    for (int i = 0; i < n && !wanted; ++i) wanted = same(vo, notes[static_cast<std::size_t>(i)]);
    if (!wanted) releaseVoice(slot, v);
  }
  // v1's rule for the envelope: a source held by a Power block alone plays the default one (R10b).
  const bool envFromChain = soundingKey || b.staticPower == 0;
  for (int i = 0; i < n; ++i) {
    const Note& x = notes[static_cast<std::size_t>(i)];
    bool sounding = false;
    for (int v = 0; v < kVoices && !sounding; ++v) sounding = b.voices[static_cast<std::size_t>(v)].active && same(b.voices[static_cast<std::size_t>(v)], x);
    if (!sounding) voiceOn(slot, x.controller, x.key, true, 0.0, envFromChain, x.channel, x.offset);
    // A held key slid (a bend): its notes follow it, sounding or just struck (no new attack for a slide).
    for (int v = 0; v < kVoices; ++v) {
      Voice& vo = b.voices[static_cast<std::size_t>(v)];
      if (vo.active && same(vo, x) && vo.bend != x.bend) { vo.bend = x.bend; setPitch(slot, v, 0.0); }
    }
  }
  updateNotePower(b);
}

}  // namespace blokdust
