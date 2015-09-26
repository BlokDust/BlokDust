import {IEffect} from '../../Blocks/IEffect';
import {ISource} from '../../Blocks/ISource';
import {PostEffect} from '../../Blocks/Effects/PostEffect';
import {Source} from '../../Blocks/Source';

export class AudioNodeConnectionManager {

    static Debug: boolean = false;

    constructor() {

        this.ExtendToneConnectionMethods();
    }

    ExtendToneConnectionMethods() {

        // Extend AudioNode.connect to include PostEffects
        (<any>AudioNode).prototype._toneConnect = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function (destination: any, outNum, inNum) {
            if (destination instanceof PostEffect) {
                destination = (<IEffect>destination).Effect;
            }
            this._toneConnect(destination, outNum, inNum);
        };
    }
}