import {ISource} from '../ISource';

export interface IPowerSource extends ISource {
    UpdateConnections(): void;
}