import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import IEffect = require("./IEffect");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifier extends Block implements IModifier {

    public CatchmentArea: number = 6; // grid units
    public Effects: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();
    public Component;

    constructor(grid: Grid, position: Point) {
        super(grid, position);
    }

    Update() {
        super.Update();
    }

}

export = Modifier;