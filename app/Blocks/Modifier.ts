import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifier extends Block implements IModifier {

    public CatchmentArea: number = 6; // grid units
    public Component;

    Modifiable: IModifiable;
    Params: ToneSettings;

    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();

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

export = Modifier;