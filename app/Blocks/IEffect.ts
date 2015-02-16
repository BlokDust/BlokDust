import IBlock = require("./IBlock");
import IModifiable = require("./IModifiable");

interface IEffect extends IBlock{
    CatchmentArea: number;
    Effect: any; // ANY TYPE OF TONE POST EFFECT

    Modifiable: IModifiable; // Should be a list of sources: Fayde.Collections.ObservableCollection<IEffect>;

    Attach(modifiable: IModifiable): void;
    Detach(modifiable: IModifiable): void;
    Delete(): void;
    SetValue(param: string,value: number): void;
    GetValue(param: string): void;
}

export = IEffect;