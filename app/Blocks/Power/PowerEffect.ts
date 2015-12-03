import {Effect} from '../Effect';
import {IPowerEffect} from './IPowerEffect';
import {ISource} from '../ISource';

export class PowerEffect extends Effect implements IPowerEffect {

    protected OldConnections: ISource[] = [];

    Init(sketch?: any): void {
        super.Init(sketch);
    }

    UpdateConnections() {}
}
