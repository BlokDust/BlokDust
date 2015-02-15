import IBlock = require("./IBlock");
import Block = require("./Block");
import IEffect = require("./IEffect");
import IModifiable = require("./IModifiable");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Effect extends Block implements IEffect {

    public CatchmentArea: number = 6; // grid units
    public Component;

    Modifiable: IModifiable;
    Params: ToneSettings;

    public Effects: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();

    constructor(grid: Grid, position: Point) {
        super(grid, position);
    }

    Update() {
        super.Update();
    }

    Connect(modifiable: IModifiable): void {
        this.Modifiable = modifiable;
    }
    Disconnect(modifiable: IModifiable): void {
        this.Modifiable = modifiable;
    }
    //Delete(): void {
    //
    //}
    //SetValue(param: string,value: number) {
    //
    //}
    //GetValue(param: string) {
    //
    //}
}

export = Effect;