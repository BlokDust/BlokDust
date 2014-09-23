import IBlock = require("./IBlock");
import IModifier = require("./IModifier");

interface IModifiable extends IBlock{
    Modifiers: Fayde.Collections.ObservableCollection<IModifier>;
    AddModifier(modifier: IModifier): void;
    RemoveModifier(modifier: IModifier): void;
}

export = IModifiable;