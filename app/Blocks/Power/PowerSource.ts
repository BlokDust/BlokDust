import {IAudioChain} from '../../Core/Audio/Connections/IAudioChain';
import {IBlock} from '../IBlock';
import {Logic} from './Logic/Logic';
import {Power} from './Power';
import {Source} from '../Source';
import ISketchContext = Fayde.Drawing.ISketchContext;

export class PowerSource extends Source {

    Init(sketch: ISketchContext): void {

        this.PowerConnections = 0;
        super.Init(sketch);
    }

    UpdateConnections(chain: IAudioChain) {
        this.Chain = chain;
    }

}
