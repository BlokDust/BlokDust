import AudioChain = require("./AudioChain");
import IEffect = require("../../../Blocks/IEffect");
import ISource = require("../../../Blocks/ISource");
import PostEffect = require("../../../Blocks/Effects/PostEffect");

class ConnectionMethodManager {

    protected _Debug: boolean = true;
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
        const postEffects:IEffect[] = [];

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
}

export = ConnectionMethodManager;