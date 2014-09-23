import IBlock = require("./IBlock");

interface IModifiable extends IBlock{
    Modify(effect: Tone.LFO): void;
}

export = IModifiable;