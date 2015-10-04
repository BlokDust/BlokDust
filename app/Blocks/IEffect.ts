import {IBlock} from './IBlock';
import {ISource} from './ISource';
import {ObservableCollection} from '../Core/Collections/ObservableCollection';

export interface IEffect extends IBlock {
    CatchmentArea: number;
    Connections: ObservableCollection<ISource>;
    Effect: any; // TODO: ANY TYPE OF TONE POST EFFECT
    Name?: string;
    AddSource(effect: ISource): void;
    RemoveSource(effect: ISource): void;
    ValidateSources(): void;
}