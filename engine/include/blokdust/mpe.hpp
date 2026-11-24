#pragma once
// MPE / MIDI → engine note commands (PLUGIN-0004). One parser per MIDI Input block (its own
// settings; commands target that block by id). Mirrored line by line in web/src/input/mpe.ts; both
// run the recorded streams in tests/mpe/*.json.
//
//   MPE on:  zones from the MPE Configuration Message (RPN 6 on channel 1 = lower zone, channel 16
//   = upper; data =
//            member count). Until one arrives, the lower zone with 15 members is assumed (the usual
//            default). Member channel: its notes follow that channel's pitch bend (± per-note
//            range, RPN 0, default 48), channel pressure / poly aftertouch (pressure) and CC74
//            (slide); the master channel's bend (± master range, default 2) adds to every note in
//            the zone. A new note gets its channel's current values right away.
//   MPE off: plain MIDI. The pitch wheel bends every note on its channel (± bendRange, default 2);
//   no pressure/slide.
#include <algorithm>
#include <array>
#include <cstdint>

#include "blokdust/engine.hpp"

namespace blokdust {

class MpeParser {
 public:
  struct Settings {
    bool mpe = false;
    double memberBendRange = 48.0;
    double plainBendRange = 2.0;
  };

  MpeParser(BlockId target = kInvalidBlock,
            BlockType controllerType = BlockType::InputMidiController) noexcept
      : target_(target), type_(controllerType) {
    reset();
  }

  void setSettings(const Settings& s) noexcept { s_ = s; }
  void setTarget(BlockId id) noexcept { target_ = id; }

  void reset() noexcept {
    for (auto& c : ch_)
      c = Channel{};
    lowerMembers_ = 15;
    upperMembers_ = 0;
    memberRange_ = -1.0;
    masterRange_[0] = masterRange_[1] = 2.0;
  }

  /// One MIDI 1.0 message (status, data1, data2) at engine sample `at` (-1 = now): each engine
  /// command it becomes is passed to `out(const Command&)`. Allocation-free (safe on the audio
  /// thread).
  template <class Sink>
  void message(std::uint8_t status, std::uint8_t d1, std::uint8_t d2, std::int64_t at, Sink&& out) {
    const int ch = status & 0x0F, kind = status & 0xF0;
    Channel& c = ch_[static_cast<std::size_t>(ch)];
    if (kind == 0x90 && d2 > 0) {
      c.notes[d1] = true;
      out(stamp(Command::noteOn(type_, d1, d2 / 127.0, at, ch)));
      if (s_.mpe || bendOf(ch) != 0.0)
        out(expr(d1, ch, Command::Expression::Bend, bendOf(ch), at));
      if (s_.mpe && c.pressure >= 0.0)
        out(expr(d1, ch, Command::Expression::Pressure, c.pressure, at));
      if (s_.mpe && c.slide >= 0.0)
        out(expr(d1, ch, Command::Expression::Slide, c.slide, at));
      return;
    }
    if (kind == 0x80 || kind == 0x90) {
      c.notes[d1] = false;
      // Pressure is the note's (slide and bend are sent before a note): the next note on this
      // channel starts fresh, not at the 0 its predecessor was released with.
      if (std::none_of(c.notes.begin(), c.notes.end(), [](bool on) { return on; }))
        c.pressure = -1.0;
      out(stamp(Command::noteOff(type_, d1, at, ch)));
      return;
    }
    if (kind == 0xE0) {  // pitch bend, 14 bit, centre 8192
      c.bend = ((d2 << 7) | d1) - 8192;
      if (s_.mpe && isMaster(ch)) {
        forZoneMembers(ch, [&](int m) { bendNotes(m, at, out); });
        bendNotes(ch, at, out);
      } else
        bendNotes(ch, at, out);
      return;
    }
    if (kind == 0xD0) {
      if (s_.mpe) {
        c.pressure = d1 / 127.0;
        eachNote(ch,
                 [&](int n) { out(expr(n, ch, Command::Expression::Pressure, c.pressure, at)); });
      }
      return;
    }
    if (kind == 0xA0) {
      if (s_.mpe && c.notes[d1])
        out(expr(d1, ch, Command::Expression::Pressure, d2 / 127.0, at));
      return;
    }
    if (kind == 0xB0) {
      if (d1 == 74) {
        if (s_.mpe) {
          c.slide = d2 / 127.0;
          eachNote(ch, [&](int n) { out(expr(n, ch, Command::Expression::Slide, c.slide, at)); });
        }
        return;
      }
      if (d1 == 101) {
        c.rpnMsb = d2;
        return;
      }
      if (d1 == 100) {
        c.rpnLsb = d2;
        return;
      }
      if (d1 == 6) {
        dataEntry(ch, d2);
        return;
      }
      if (d1 == 123) {
        eachNote(ch, [&](int n) {
          c.notes[n] = false;
          out(stamp(Command::noteOff(type_, static_cast<std::uint8_t>(n), at, ch)));
        });
        return;
      }
    }
  }

 private:
  struct Channel {
    std::array<bool, 128> notes{};
    int bend = 0;                          // −8192 … 8191
    double pressure = -1.0, slide = -1.0;  // −1: not received yet
    int rpnMsb = 127, rpnLsb = 127;
  };

  Command stamp(Command c) const noexcept {
    c.id = target_;
    return c;
  }
  Command expr(int note, int ch, Command::Expression d, double v, std::int64_t at) const noexcept {
    return stamp(Command::noteExpression(type_, static_cast<std::uint8_t>(note), ch, d, v, at));
  }
  bool isMaster(int ch) const noexcept {
    return (ch == 0 && lowerMembers_ > 0) || (ch == 15 && upperMembers_ > 0);
  }
  /// Member channels of the zone whose master is `master` (lower: 2…, upper: …15, as 0-based
  /// indices).
  template <class F>
  void forZoneMembers(int master, F f) const {
    if (master == 0)
      for (int i = 1; i <= lowerMembers_; ++i)
        f(i);
    else
      for (int i = 0; i < upperMembers_; ++i)
        f(14 - i);
  }
  int zoneMasterOf(int ch) const noexcept {
    if (lowerMembers_ > 0 && ch >= 1 && ch <= lowerMembers_)
      return 0;
    if (upperMembers_ > 0 && ch <= 14 && ch >= 15 - upperMembers_)
      return 15;
    return -1;
  }
  /// Semitones for notes on `ch`: its own bend × its range, plus its zone master's bend (MPE).
  double bendOf(int ch) const noexcept {
    const Channel& c = ch_[static_cast<std::size_t>(ch)];
    if (!s_.mpe)
      return c.bend / 8192.0 * s_.plainBendRange;
    if (isMaster(ch))
      return c.bend / 8192.0 * masterRange_[ch == 0 ? 0 : 1];
    const double own = c.bend / 8192.0 * (memberRange_ >= 0.0 ? memberRange_ : s_.memberBendRange);
    const int m = zoneMasterOf(ch);
    return own +
           (m < 0 ? 0.0
                  : ch_[static_cast<std::size_t>(m)].bend / 8192.0 * masterRange_[m == 0 ? 0 : 1]);
  }
  template <class F>
  void eachNote(int ch, F f) {
    for (int n = 0; n < 128; ++n)
      if (ch_[static_cast<std::size_t>(ch)].notes[static_cast<std::size_t>(n)])
        f(n);
  }
  template <class Sink>
  void bendNotes(int ch, std::int64_t at, Sink& out) {
    const double b = bendOf(ch);
    eachNote(ch, [&](int n) { out(expr(n, ch, Command::Expression::Bend, b, at)); });
  }
  void dataEntry(int ch, int value) noexcept {
    const Channel& c = ch_[static_cast<std::size_t>(ch)];
    if (c.rpnMsb == 0 && c.rpnLsb == 6) {  // MPE Configuration Message
      if (ch == 0) {
        lowerMembers_ = std::min(value, 15);
        if (upperMembers_ > 15 - lowerMembers_)
          upperMembers_ = 15 - lowerMembers_;
      } else if (ch == 15) {
        upperMembers_ = std::min(value, 15);
        if (lowerMembers_ > 15 - upperMembers_)
          lowerMembers_ = 15 - upperMembers_;
      }
      if (ch == 0 || ch == 15) {
        masterRange_[ch == 0 ? 0 : 1] = 2.0;
        memberRange_ = -1.0;
      }
    } else if (c.rpnMsb == 0 && c.rpnLsb == 0) {  // pitch bend sensitivity (semitones)
      if (s_.mpe && isMaster(ch))
        masterRange_[ch == 0 ? 0 : 1] = value;
      else if (s_.mpe)
        memberRange_ = value;
      else
        s_.plainBendRange = value;
    }
  }

  Settings s_;
  BlockId target_;
  BlockType type_;
  std::array<Channel, 16> ch_{};
  int lowerMembers_ = 15, upperMembers_ = 0;
  double memberRange_ = -1.0;  // from RPN 0 on a member channel; −1: use Settings
  std::array<double, 2> masterRange_{{2.0, 2.0}};
};

/// Host MIDI → every MIDI Input block, each through its own parser with that block's settings (MPE
/// switch, bend range). Fixed capacity, allocation-free: call sync() once per audio block, then
/// message() per MIDI event.
class MidiRouter {
 public:
  static constexpr int kMax = 8;
  void sync(const Engine& e) noexcept {
    int n = 0;
    std::array<Slot, kMax> next{};
    for (const Block& b : e.blocks()) {
      if (!b.alive || b.type != BlockType::InputMidiController || n == kMax)
        continue;
      Slot s{};
      for (int i = 0; i < count_; ++i)
        if (slots_[static_cast<std::size_t>(i)].id == b.id)
          s = slots_[static_cast<std::size_t>(i)];  // keep its state
      if (s.id != b.id) {
        s.id = b.id;
        s.parser = MpeParser(b.id);
      }
      s.parser.setSettings({b.params[gen::param::InputMidiController::mpe] != 0.0,
                            b.params[gen::param::InputMidiController::bendRange], 2.0});
      next[static_cast<std::size_t>(n++)] = s;
    }
    slots_ = next;
    count_ = n;
  }
  template <class Sink>
  void message(std::uint8_t status, std::uint8_t d1, std::uint8_t d2, std::int64_t at, Sink&& out) {
    for (int i = 0; i < count_; ++i)
      slots_[static_cast<std::size_t>(i)].parser.message(status, d1, d2, at, out);
  }
  int count() const noexcept { return count_; }

 private:
  struct Slot {
    BlockId id = kInvalidBlock;
    MpeParser parser;
  };
  std::array<Slot, kMax> slots_{};
  int count_ = 0;
};

}  // namespace blokdust
