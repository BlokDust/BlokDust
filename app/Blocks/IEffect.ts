import IBlock = require("./IBlock");
import ISource = require("./ISource");

interface IEffect extends IBlock{
    CatchmentArea: number;
    Effect: any; // ANY TYPE OF TONE POST EFFECT

    Source: ISource; // Should be a list of sources: Fayde.Collections.ObservableCollection<IEffect>;

    Attach(source: ISource): void;
    Detach(source: ISource): void;
    Delete(): void;
    SetValue(param: string,value: number): void;
    GetValue(param: string): void;
}

export = IEffect;