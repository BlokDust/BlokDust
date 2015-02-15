import IBlock = require("./IBlock");
import IModifiable = require("./IModifiable");

interface IEffect extends IBlock{
    CatchmentArea: number;

    Component;

    Modifiable: IModifiable; // Should be a list of sources: Fayde.Collections.ObservableCollection<IEffect>;

    Connect(modifiable: IModifiable): void;
    Disconnect(modifiable: IModifiable): void;
    Delete(): void;
    SetValue(param: string,value: number): void;
    GetValue(param: string): void;
}

export = IEffect;