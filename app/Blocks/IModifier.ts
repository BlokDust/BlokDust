import IBlock = require("./IBlock");
import IModifiable = require("./IModifiable");

interface IModifier extends IBlock{
    CatchmentArea: number;

    Component;

    Modifiable: IModifiable; // Should be list instead Effects: Fayde.Collections.ObservableCollection<IEffect>;

    Connect(modifiable: IModifiable): void;
    Disconnect(modifiable: IModifiable): void;
    Delete(): void;
    SetValue(param: string,value: number): void;
    GetValue(param: string): void;
}

export = IModifier;