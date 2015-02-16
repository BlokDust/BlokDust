import IBlock = require("./IBlock");
import Block = require("./Block");
import IEffect = require("./IEffect");
import IModifiable = require("./IModifiable");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Effect extends Block implements IEffect {

    public CatchmentArea: number = 6; // grid units
    public Effect; // ANY TYPE OF TONE POST EFFECT

    Modifiable: IModifiable;
    Params: ToneSettings;

    constructor(grid: Grid, position: Point) {
        super(grid, position);
    }

    Update() {
        super.Update();
    }

    Attach(modifiable: IModifiable): void {
        this.Modifiable = modifiable;
    }

    Detach(modifiable: IModifiable): void {
        this.Modifiable = modifiable;
    }
}

export = Effect;