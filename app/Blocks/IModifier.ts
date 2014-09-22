import IBlock = require("./IBlock");
import IModifiable = require("./IModifiable");

interface IModifier extends IBlock{
    Targets: Fayde.Collections.ObservableCollection<IModifiable>;
    CatchmentArea: number;
}

export = IModifier;