import {IEffect} from '../IEffect';

export interface IPowerEffect extends IEffect {
    UpdateConnections(): void;
}