import IBlock = require("./IBlock");
import IModifiable = require("./IModifiable");
import IEffect = require("./IEffect");

interface IModifier extends IBlock{
    CatchmentArea: number;
    Effects: Fayde.Collections.ObservableCollection<IEffect>;
    Component;
}

export = IModifier;