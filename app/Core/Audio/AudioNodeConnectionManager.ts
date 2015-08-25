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

        this.ExtendToneConnectionMethods();
    }

    ExtendToneConnectionMethods() {

        console.log(typeof App.Audio.Tone);
        console.log(typeof App.Audio.Tone.connect);

        // Extend AudioNode.connect to include PostEffects
        (<any>AudioNode).prototype._toneConnect = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function (destination: any, outNum, inNum) {
            if (destination instanceof PostEffect) {
                destination = destination.Effect;
            }
            this._toneConnect(destination, outNum, inNum);
        };


        // Extend Tone.connect to connect from PostEffect.Effect.output
        // TODO: extend the function with completely overwriting it
        Tone.prototype.connect = function(unit, outputNum, inputNum){
            if (Array.isArray(this.output)){
                outputNum = this.defaultArg(outputNum, 0);
                this.output[outputNum].connect(unit, 0, inputNum);
            } else if (this instanceof PostEffect) {
                this.Effect.connect(unit, outputNum, inputNum)
            } else {
                this.output.connect(unit, outputNum, inputNum);
            }
            return this;
        };

        Tone.prototype.disconnect = function(outputNum){
            if (Array.isArray(this.output)){
                outputNum = this.defaultArg(outputNum, 0);
                this.output[outputNum].disconnect();
            } else if (this instanceof PostEffect) {
                this.Effect.disconnect()
            } else {
                this.output.disconnect();
            }
            return this;
        };
    }


}

export = AudioNodeConnectionManager;