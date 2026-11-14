// MPE / MIDI → engine note commands (PLUGIN-0004). Mirrors engine/include/blokdust/mpe.hpp line by line (the plugin
// uses that); both run the recorded streams in tests/mpe/*.json. One parser per MIDI Input block, targeting it by id.
//   MPE on:  zones from the MPE Configuration Message (RPN 6 on channel 1 / 16); lower zone with 15 members until one
//            arrives. Member notes follow their channel's bend (± per-note range, RPN 0, default 48), channel pressure
//            or poly aftertouch (pressure) and CC74 (slide); the master channel's bend (± 2) adds to the whole zone.
//   MPE off: plain MIDI: the pitch wheel bends every note on its channel (± 2); no pressure/slide.
import { CommandType, type Command } from '../engine/wasmEngine.ts';

export interface MpeSettings { mpe: boolean; memberBendRange: number; plainBendRange: number }
const EXPR = { bend: 0, pressure: 1, slide: 2 } as const;

interface Channel { notes: boolean[]; bend: number; pressure: number; slide: number; rpnMsb: number; rpnLsb: number }
const freshChannel = (): Channel => ({ notes: new Array(128).fill(false), bend: 0, pressure: -1, slide: -1, rpnMsb: 127, rpnLsb: 127 });

export class MpeParser {
  private s: MpeSettings = { mpe: false, memberBendRange: 48, plainBendRange: 2 };
  private ch: Channel[] = [];
  private lowerMembers = 15;
  private upperMembers = 0;
  private memberRange = -1;
  private masterRange: [number, number] = [2, 2];

  private target: number;
  private readonly controllerType: number;
  constructor(target: number, controllerType: number) { this.target = target; this.controllerType = controllerType; this.reset(); }

  setSettings(s: Partial<MpeSettings>): void { this.s = { ...this.s, ...s }; }
  setTarget(id: number): void { this.target = id; }

  reset(): void {
    this.ch = Array.from({ length: 16 }, freshChannel);
    this.lowerMembers = 15; this.upperMembers = 0;
    this.memberRange = -1; this.masterRange = [2, 2];
  }

  /** One MIDI 1.0 message at engine sample `at` (-1 = now): the engine commands it becomes. */
  message(status: number, d1: number, d2: number, at = -1, out: Command[] = []): Command[] {
    const ch = status & 0x0f, kind = status & 0xf0, c = this.ch[ch];
    if (kind === 0x90 && d2 > 0) {
      c.notes[d1] = true;
      out.push(this.cmd(CommandType.NoteOn, d1, ch, d2 / 127, at));
      if (this.s.mpe || this.bendOf(ch) !== 0) out.push(this.expr(d1, ch, EXPR.bend, this.bendOf(ch), at));
      if (this.s.mpe && c.pressure >= 0) out.push(this.expr(d1, ch, EXPR.pressure, c.pressure, at));
      if (this.s.mpe && c.slide >= 0) out.push(this.expr(d1, ch, EXPR.slide, c.slide, at));
      return out;
    }
    if (kind === 0x80 || kind === 0x90) {
      c.notes[d1] = false;
      if (!c.notes.includes(true)) c.pressure = -1;  // pressure is the note's: the next note on this channel starts fresh
      out.push(this.cmd(CommandType.NoteOff, d1, ch, 0, at));
      return out;
    }
    if (kind === 0xe0) {
      c.bend = ((d2 << 7) | d1) - 8192;
      if (this.s.mpe && this.isMaster(ch)) { for (const m of this.zoneMembers(ch)) this.bendNotes(m, at, out); this.bendNotes(ch, at, out); }
      else this.bendNotes(ch, at, out);
      return out;
    }
    if (kind === 0xd0) { if (this.s.mpe) { c.pressure = d1 / 127; this.eachNote(ch, n => out.push(this.expr(n, ch, EXPR.pressure, c.pressure, at))); } return out; }
    if (kind === 0xa0) { if (this.s.mpe && c.notes[d1]) out.push(this.expr(d1, ch, EXPR.pressure, d2 / 127, at)); return out; }
    if (kind === 0xb0) {
      if (d1 === 74) { if (this.s.mpe) { c.slide = d2 / 127; this.eachNote(ch, n => out.push(this.expr(n, ch, EXPR.slide, c.slide, at))); } return out; }
      if (d1 === 101) { c.rpnMsb = d2; return out; }
      if (d1 === 100) { c.rpnLsb = d2; return out; }
      if (d1 === 6) { this.dataEntry(ch, d2); return out; }
      if (d1 === 123) { this.eachNote(ch, n => { c.notes[n] = false; out.push(this.cmd(CommandType.NoteOff, n, ch, 0, at)); }); return out; }
    }
    return out;
  }

  private cmd(type: number, note: number, ch: number, value: number, at: number): Command {
    return { type: type as Command['type'], id: this.target, blockType: this.controllerType, param: note, x: ch, value, atSample: at };
  }
  private expr(note: number, ch: number, dim: number, value: number, at: number): Command {
    return { type: CommandType.NoteExpression, id: this.target, blockType: this.controllerType, param: note, x: ch, y: dim, value, atSample: at };
  }
  private isMaster(ch: number): boolean { return (ch === 0 && this.lowerMembers > 0) || (ch === 15 && this.upperMembers > 0); }
  private zoneMembers(master: number): number[] {
    const m: number[] = [];
    if (master === 0) for (let i = 1; i <= this.lowerMembers; i++) m.push(i);
    else for (let i = 0; i < this.upperMembers; i++) m.push(14 - i);
    return m;
  }
  private zoneMasterOf(ch: number): number {
    if (this.lowerMembers > 0 && ch >= 1 && ch <= this.lowerMembers) return 0;
    if (this.upperMembers > 0 && ch <= 14 && ch >= 15 - this.upperMembers) return 15;
    return -1;
  }
  private bendOf(ch: number): number {
    const c = this.ch[ch];
    if (!this.s.mpe) return c.bend / 8192 * this.s.plainBendRange;
    if (this.isMaster(ch)) return c.bend / 8192 * this.masterRange[ch === 0 ? 0 : 1];
    const own = c.bend / 8192 * (this.memberRange >= 0 ? this.memberRange : this.s.memberBendRange);
    const m = this.zoneMasterOf(ch);
    return own + (m < 0 ? 0 : this.ch[m].bend / 8192 * this.masterRange[m === 0 ? 0 : 1]);
  }
  private eachNote(ch: number, f: (n: number) => void): void { for (let n = 0; n < 128; n++) if (this.ch[ch].notes[n]) f(n); }
  private bendNotes(ch: number, at: number, out: Command[]): void { const b = this.bendOf(ch); this.eachNote(ch, n => out.push(this.expr(n, ch, EXPR.bend, b, at))); }
  private dataEntry(ch: number, value: number): void {
    const c = this.ch[ch];
    if (c.rpnMsb === 0 && c.rpnLsb === 6) {
      if (ch === 0) { this.lowerMembers = Math.min(value, 15); if (this.upperMembers > 15 - this.lowerMembers) this.upperMembers = 15 - this.lowerMembers; }
      else if (ch === 15) { this.upperMembers = Math.min(value, 15); if (this.lowerMembers > 15 - this.upperMembers) this.lowerMembers = 15 - this.upperMembers; }
      if (ch === 0 || ch === 15) { this.masterRange[ch === 0 ? 0 : 1] = 2; this.memberRange = -1; }
    } else if (c.rpnMsb === 0 && c.rpnLsb === 0) {
      if (this.s.mpe && this.isMaster(ch)) this.masterRange[ch === 0 ? 0 : 1] = value;
      else if (this.s.mpe) this.memberRange = value;
      else this.s.plainBendRange = value;
    }
  }
}
