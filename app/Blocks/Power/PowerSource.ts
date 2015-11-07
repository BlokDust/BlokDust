import {IAudioChain} from '../../Core/Audio/Connections/IAudioChain';
import {IBlock} from '../IBlock';
import IDisplayContext = etch.drawing.IDisplayContext;
import {Logic} from './Logic/Logic';
import {Power} from './Power';
import {Source} from '../Source';

export class PowerSource extends Source {

    Init(drawTo: IDisplayContext): void {
        this.PowerConnections = 0;
        super.Init(drawTo);
    }

    UpdateConnections(chain: IAudioChain) {
        this.Chain = chain;
    }

}
