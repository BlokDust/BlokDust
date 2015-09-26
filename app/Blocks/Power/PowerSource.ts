import {IAudioChain} from '../../Core/Audio/Connections/IAudioChain';
import {IBlock} from '../IBlock';
import {IPowerSource} from './IPowerSource';
import {Logic} from './Logic/Logic';
import {Power} from './Power';
import {Source} from '../Source';

export class PowerSource extends Source implements IPowerSource {

    Init(sketch?: any): void {

        this.PowerConnections = 0;
        super.Init(sketch);
    }

    UpdateConnections() {}

}