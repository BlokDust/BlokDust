import IEffect = require("../../Blocks/IEffect");
import ISource = require("../../Blocks/ISource");
import Source = require("../../Blocks/Source")
import PostEffect = require("../../Blocks/Effects/PostEffect");

class AudioNodeConnectionManager {

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

export = AudioNodeConnectionManager;