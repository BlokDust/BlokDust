import AudioChain = require("./AudioChain");
import IEffect = require("../../../Blocks/IEffect");
import ISource = require("../../../Blocks/ISource");
import IBlock = require("../../../Blocks/IBlock");
import PowerEffect = require("../../../Blocks/Power/PowerEffect");
import PostEffect = require("../../../Blocks/Effects/PostEffect");
import IPreEffect = require("../../../Blocks/Effects/IPreEffect");

class ConnectionMethodManager {

    protected _Debug: boolean = false;
    public Chains: AudioChain[] = [];

    constructor(){

    }

    public Update(){
        if (this._Debug) console.clear();
    }

    public GetPostEffectsFromSource(source: ISource): IEffect[] {
        // List of connected effect blocks
        const effects:IEffect[] = source.Connections.ToArray();

        // List of PostEffect blocks
        const postEffects: IEffect[] = [];

        // For each connected effect
        for (let i = 0; i < effects.length; i++) {

            // If this is a post effect add to postEffect list
            if (effects[i] instanceof PostEffect) {
                //    if (effects[i].Effect) {
                postEffects.push(effects[i]);
            }
        }

        return postEffects;
    }

    GetChainFromBlock(block:IBlock): AudioChain | boolean {
        var _chain: any;
        this.Chains.forEach((chain: AudioChain) => {
            // if block is in chain return the chain
            if (chain.Connections.indexOf(block) !== -1) {
                _chain = chain;
            }
        });

        return _chain;
    }

    GetChainFromPreEffect(block:IPreEffect): AudioChain | boolean {
        var _chain: any;
        this.Chains.forEach((chain: AudioChain) => {
            // if block is in chain return the chain
            if (chain.PreEffects.indexOf(block) !== -1) {
                _chain = chain;
            }
        });

        return _chain;
    }
}

export = ConnectionMethodManager;