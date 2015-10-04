import {IAudioChain} from '../../Core/Audio/Connections/IAudioChain';
import {IBlock} from '../IBlock';
import {IDisplayContext} from '../../Core/Drawing/IDisplayContext';
import {Logic} from './Logic/Logic';
import {Power} from './Power';
import {Source} from '../Source';

export class PowerSource extends Source {

    Init(sketch: IDisplayContext): void {
        this.PowerConnections = 0;
        super.Init(sketch);
    }

    UpdateConnections(chain: IAudioChain) {
        this.Chain = chain;
    }

}
