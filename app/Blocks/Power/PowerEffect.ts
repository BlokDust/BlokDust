import {Effect} from '../Effect';
import {IPowerEffect} from './IPowerEffect';

export class PowerEffect extends Effect implements IPowerEffect {

    Init(sketch?: any): void {
        super.Init(sketch);
    }

    UpdateConnections() {}
}