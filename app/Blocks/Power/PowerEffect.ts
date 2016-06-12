import {Effect} from '../Effect';
import {IPowerEffect} from './IPowerEffect';
import {ISource} from '../ISource';

export class PowerEffect extends Effect implements IPowerEffect {

    protected OldConnections: ISource[] = [];

    init(drawTo?: any): void {
        super.init(drawTo);
    }

    UpdateConnections() {}
}
