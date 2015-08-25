import IBlock = require("./IBlock");
import ISource = require("./ISource");

interface IEffect extends IBlock {
    CatchmentArea: number;
    Effect: any; // TODO: ANY TYPE OF TONE POST EFFECT
    Name?: string;

    //Sources: Fayde.Collections.ObservableCollection<ISource>;
    Connections: Fayde.Collections.ObservableCollection<ISource>;

    AddSource(effect: ISource): void;
    RemoveSource(effect: ISource): void;

    Attach(source: ISource): void;
    Detach(source: ISource): void;

    ValidateSources(): void;
}

export = IEffect;