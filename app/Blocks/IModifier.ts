import IBlock = require("./IBlock");
import IModifiable = require("./IModifiable");

interface IModifier extends IBlock{
    CatchmentArea: number;
    Effects: Fayde.Collections.ObservableCollection<Tone.LFO>;
}

export = IModifier;