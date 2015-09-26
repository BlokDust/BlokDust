import {IBlock} from './IBlock';
import {ISource} from './ISource';

export interface IEffect extends IBlock {
    CatchmentArea: number;
    Connections: Fayde.Collections.ObservableCollection<ISource>;
    Effect: any; // TODO: ANY TYPE OF TONE POST EFFECT
    Name?: string;
    AddSource(effect: ISource): void;
    RemoveSource(effect: ISource): void;
    ValidateSources(): void;
}