import {IAudioChain} from '../../Core/Audio/Connections/IAudioChain';
import {ISource} from '../ISource';

export interface IPowerSource extends ISource {
    UpdateConnections(): void;
}