// MPE / MIDI → engine note commands (PLUGIN-0004): engine/include/blokdust/mpe.hpp line for line
// (its header explains zones and bend ranges); both run tests/mpe/*.json. One per MIDI Input block.
import { CommandType, type Command } from '../engine/wasmEngine.ts';

export interface MpeSettings {
  mpe: boolean;
  memberBendRange: number;
  plainBendRange: number;
}
const EXPR = { bend: 0, pressure: 1, slide: 2 } as const;

interface Channel {
  notes: boolean[];
  bend: number;
  pressure: number;
  slide: number;
  rpnMsb: number;
  rpnLsb: number;
}
const freshChannel = (): Channel => ({
  notes: new Array<boolean>(128).fill(false),
  bend: 0,
  pressure: -1,
  slide: -1,
  rpnMsb: 127,
  rpnLsb: 127,
});

export class MpeParser {
  private settings: MpeSettings = { mpe: false, memberBendRange: 48, plainBendRange: 2 };
  private ch: Channel[] = [];
  private lowerMembers = 15;
  private upperMembers = 0;
  private memberRange = -1;
  private masterRange: [number, number] = [2, 2];

  private target: number;
  private readonly controllerType: number;
  constructor(target: number, controllerType: number) {
    this.target = target;
    this.controllerType = controllerType;
    this.reset();
  }

  setSettings(changes: Partial<MpeSettings>): void {
    this.settings = { ...this.settings, ...changes };
  }
  setTarget(id: number): void {
    this.target = id;
  }

  reset(): void {
    this.ch = Array.from({ length: 16 }, freshChannel);
    this.lowerMembers = 15;
    this.upperMembers = 0;
    this.memberRange = -1;
    this.masterRange = [2, 2];
  }

  /** One MIDI 1.0 message at engine sample `at` (-1 = now): the engine commands it becomes. */
  message(status: number, d1: number, d2: number, at = -1, out: Command[] = []): Command[] {
    const ch = status & 0x0f,
      kind = status & 0xf0,
      channel = this.ch[ch];
    if (kind === 0x90 && d2 > 0) {
      channel.notes[d1] = true;
      out.push(this.cmd(CommandType.NoteOn, d1, ch, d2 / 127, at));
      if (this.settings.mpe || this.bendOf(ch) !== 0)
        out.push(this.expr(d1, ch, EXPR.bend, this.bendOf(ch), at));
      if (this.settings.mpe && channel.pressure >= 0)
        out.push(this.expr(d1, ch, EXPR.pressure, channel.pressure, at));
      if (this.settings.mpe && channel.slide >= 0)
        out.push(this.expr(d1, ch, EXPR.slide, channel.slide, at));
      return out;
    }
    if (kind === 0x80 || kind === 0x90) {
      channel.notes[d1] = false;
      // pressure is the note's: the next note on this channel starts fresh
      if (!channel.notes.includes(true)) channel.pressure = -1;
      out.push(this.cmd(CommandType.NoteOff, d1, ch, 0, at));
      return out;
    }
    if (kind === 0xe0) {
      channel.bend = ((d2 << 7) | d1) - 8192;
      if (this.settings.mpe && this.isMaster(ch)) {
        for (const member of this.zoneMembers(ch)) this.bendNotes(member, at, out);
        this.bendNotes(ch, at, out);
      } else this.bendNotes(ch, at, out);
      return out;
    }
    if (kind === 0xd0) {
      if (this.settings.mpe) {
        channel.pressure = d1 / 127;
        this.eachNote(ch, (note) =>
          out.push(this.expr(note, ch, EXPR.pressure, channel.pressure, at)),
        );
      }
      return out;
    }
    if (kind === 0xa0) {
      if (this.settings.mpe && channel.notes[d1])
        out.push(this.expr(d1, ch, EXPR.pressure, d2 / 127, at));
      return out;
    }
    if (kind === 0xb0) {
      if (d1 === 74) {
        if (this.settings.mpe) {
          channel.slide = d2 / 127;
          this.eachNote(ch, (note) => out.push(this.expr(note, ch, EXPR.slide, channel.slide, at)));
        }
        return out;
      }
      if (d1 === 101) {
        channel.rpnMsb = d2;
        return out;
      }
      if (d1 === 100) {
        channel.rpnLsb = d2;
        return out;
      }
      if (d1 === 6) {
        this.dataEntry(ch, d2);
        return out;
      }
      if (d1 === 123) {
        this.eachNote(ch, (note) => {
          channel.notes[note] = false;
          out.push(this.cmd(CommandType.NoteOff, note, ch, 0, at));
        });
        return out;
      }
    }
    return out;
  }

  private cmd(type: number, note: number, ch: number, value: number, at: number): Command {
    return {
      type: type as Command['type'],
      id: this.target,
      blockType: this.controllerType,
      param: note,
      x: ch,
      value,
      atSample: at,
    };
  }
  private expr(note: number, ch: number, dim: number, value: number, at: number): Command {
    return {
      type: CommandType.NoteExpression,
      id: this.target,
      blockType: this.controllerType,
      param: note,
      x: ch,
      y: dim,
      value,
      atSample: at,
    };
  }
  private isMaster(ch: number): boolean {
    return (ch === 0 && this.lowerMembers > 0) || (ch === 15 && this.upperMembers > 0);
  }
  private zoneMembers(master: number): number[] {
    const members: number[] = [];
    if (master === 0) for (let i = 1; i <= this.lowerMembers; i++) members.push(i);
    else for (let i = 0; i < this.upperMembers; i++) members.push(14 - i);
    return members;
  }
  private zoneMasterOf(ch: number): number {
    if (this.lowerMembers > 0 && ch >= 1 && ch <= this.lowerMembers) return 0;
    if (this.upperMembers > 0 && ch <= 14 && ch >= 15 - this.upperMembers) return 15;
    return -1;
  }
  private bendOf(ch: number): number {
    const channel = this.ch[ch];
    if (!this.settings.mpe) return (channel.bend / 8192) * this.settings.plainBendRange;
    if (this.isMaster(ch)) return (channel.bend / 8192) * this.masterRange[ch === 0 ? 0 : 1];
    const own =
      (channel.bend / 8192) *
      (this.memberRange >= 0 ? this.memberRange : this.settings.memberBendRange);
    const master = this.zoneMasterOf(ch);
    return (
      own +
      (master < 0 ? 0 : (this.ch[master].bend / 8192) * this.masterRange[master === 0 ? 0 : 1])
    );
  }
  private eachNote(ch: number, visit: (n: number) => void): void {
    for (let note = 0; note < 128; note++) if (this.ch[ch].notes[note]) visit(note);
  }
  private bendNotes(ch: number, at: number, out: Command[]): void {
    const b = this.bendOf(ch);
    this.eachNote(ch, (note) => out.push(this.expr(note, ch, EXPR.bend, b, at)));
  }
  private dataEntry(ch: number, value: number): void {
    const channel = this.ch[ch];
    if (channel.rpnMsb === 0 && channel.rpnLsb === 6) {
      if (ch === 0) {
        this.lowerMembers = Math.min(value, 15);
        if (this.upperMembers > 15 - this.lowerMembers) this.upperMembers = 15 - this.lowerMembers;
      } else if (ch === 15) {
        this.upperMembers = Math.min(value, 15);
        if (this.lowerMembers > 15 - this.upperMembers) this.lowerMembers = 15 - this.upperMembers;
      }
      if (ch === 0 || ch === 15) {
        this.masterRange[ch === 0 ? 0 : 1] = 2;
        this.memberRange = -1;
      }
    } else if (channel.rpnMsb === 0 && channel.rpnLsb === 0) {
      if (this.settings.mpe && this.isMaster(ch)) this.masterRange[ch === 0 ? 0 : 1] = value;
      else if (this.settings.mpe) this.memberRange = value;
      else this.settings.plainBendRange = value;
    }
  }
}
