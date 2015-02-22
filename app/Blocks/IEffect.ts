import IBlock = require("./IBlock");
import ISource = require("./ISource");

interface IEffect extends IBlock{
    CatchmentArea: number;
    Effect: any; // ANY TYPE OF TONE POST EFFECT
    Name?: string;

    //Source: ISource; // Should be a list of sources instead
    Sources: Fayde.Collections.ObservableCollection<ISource>;
    AddSource(effect: ISource): void;
    RemoveSource(effect: ISource): void;

    Attach(source: ISource): void;
    Detach(source: ISource): void;

    Delete(): void;
    SetValue(param: string,value: number): void;
    GetValue(param: string): void;

    ValidateSources(): void;
}

export = IEffect;