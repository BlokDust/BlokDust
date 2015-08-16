import IEffect = require("../../Blocks/IEffect");
import ISource = require("../../Blocks/ISource");
import Source = require("../../Blocks/Source")
import PostEffect = require("../../Blocks/Effects/PostEffect");

class AudioNodeConnectionManager {

    static Debug: boolean = false;

    constructor() {

        if (AudioNodeConnectionManager.Debug) {

            //extend the connect function to include connection logging
            (<any>AudioNode).prototype._toneConnect = AudioNode.prototype.connect;
            AudioNode.prototype.connect = function (B, outNum, inNum) {
                this._toneConnect(B, outNum, inNum);

                console.log('connect: ', this, ' to ', B);
            };

            //extend the disconnect function to include disconnection logging
            (<any>AudioNode).prototype._toneDisconnect = AudioNode.prototype.disconnect;
            AudioNode.prototype.disconnect = function (outputNum) {
                this._toneDisconnect(outputNum);

                console.log('disconnect: ', this);
            };

        }
    }


}

export = AudioNodeConnectionManager;