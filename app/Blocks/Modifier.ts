import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import IEffect = require("./IEffect");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifier extends Block implements IModifier {

    public CatchmentArea: number = .1; // normalised to 1/10 of blocks view default width
    public Effects: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();

    constructor(grid: Grid, position: Point) {
        super(grid, position);
    }

    Update() {
        super.Update();
    }

}

export = Modifier;