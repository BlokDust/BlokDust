import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import Block = require("./Block");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifiable extends Block implements IModifiable{
    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();

    constructor(position:Point) {
        super(position);
    }

    AddModifier(modifier: IModifier) {
        this.Modifiers.Add(modifier);
    }

    RemoveModifier(modifier: IModifier) {
        this.Modifiers.Remove(modifier);
    }
}

export = Modifiable;