import IBlock = require("./IBlock");
import Block = require("./Block");
import IEffect = require("./IEffect");
import ISource = require("./ISource");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Effect extends Block implements IEffect {

    public CatchmentArea: number = 6; // grid units
    public Effect; // ANY TYPE OF TONE POST EFFECT

    Source: ISource;
    Params: ToneSettings;

    constructor(grid: Grid, position: Point) {
        super(grid, position);

        this.OpenParams();
    }

    Update() {
        super.Update();
    }

    Attach(source: ISource): void {
        this.Source = source;
    }

    Detach(source: ISource): void {
        this.Source = source;
    }
}

export = Effect;