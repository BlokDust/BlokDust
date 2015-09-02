import ConnectionMethodManager = require("./ConnectionMethodManager");
import IBlock = require("../../../Blocks/IBlock");
import IEffect = require("../../../Blocks/IEffect");
import IPreEffect = require("../../../Blocks/Effects/IPreEffect");
import ISource = require("../../../Blocks/ISource");
import Source = require("../../../Blocks/Source");
import Effect = require("../../../Blocks/Effect");
import PostEffect = require("../../../Blocks/Effects/PostEffect");
import PreEffect = require("../../../Blocks/Effects/PreEffect");
import AudioChain = require("./AudioChain");

class AccumulativeConnectionMethod extends ConnectionMethodManager {

    private _MuteBufferTime: number = 35;
    private connectionTimeout;
    private unMuteTimeout;

    constructor(){
        super()
    }

    Update() {
        super.Update();
        this.Disconnect();
    }

    private _DisconnectionDone(){
        const chains = this.CreateChains();
        this.Connect(chains);
    }

    public Disconnect() {
        //First mute everything
        App.Audio.Master.mute = true;

        clearTimeout(this.connectionTimeout);
        clearTimeout(this.unMuteTimeout);

        this.connectionTimeout = setTimeout(()=> {
            // Disconnect everything first!

            App.Blocks.forEach((block: IBlock) => {
                if (block instanceof Source) {
                    (<ISource>block).AudioInput.disconnect();
                } else if (block instanceof PostEffect) {
                    (<IEffect>block).Effect.disconnect();
                }
                block.IsChained = false;
            });

            // Reset the chains array
            this.Chains = [];

            this._DisconnectionDone();
        }, this._MuteBufferTime);
    }

    private _ParseConnections(chain: AudioChain, parentBlock: IBlock){

        // if parentBlock isn't already in a Chain
        if (chain.Connections.indexOf(parentBlock) === -1){
            // add parentBlock to Chain
            chain.Connections.push(parentBlock);
            // set parentBlock.isChained = true
            parentBlock.IsChained = true;
            // forEach connected childbock (source / effect)
            let parentConnections = parentBlock.Connections.ToArray();
            parentConnections.forEach((childBlock) => {
                // ParseConnections(audioChain, childBlock)
                this._ParseConnections(chain, childBlock);
            });

        }

    }

    public CreateChains(): AudioChain[] {
        // for each block
        App.Blocks.forEach((block:IBlock) => {
            // if block isn't chained
            if (!block.IsChained) {
                //create audioChain, add to audioChains[]
                var chain:AudioChain = new AudioChain();
                this.Chains.push(chain);
                this._ParseConnections(chain, block)
            }
        });

        // Now sort connections into lists of Sources, PostEffects and PreEffects
        this.Chains.forEach((chain: AudioChain) => {
            chain.Connections.forEach((block: IBlock) => {
                if (block instanceof Source) {
                    chain.Sources.push(<ISource>block);
                } else if (block instanceof PostEffect){
                    chain.PostEffects.push(<IEffect>block);
                } else if (block instanceof PreEffect) {
                    chain.PreEffects.push(<PreEffect>block);
                } else {
                    chain.Others.push(block);
                }
            });
        });
        return this.Chains;
    }

    public Connect(chains: AudioChain[]) {
        if (this._Debug) console.log(chains);

        // loop through chains
        chains.forEach((chain: AudioChain) => {

            // Certain blocks need an individual update method for exclusive functionality. ie preEffects, Power, Source resets
            chain.Connections.forEach((block: IBlock) => {
                block.UpdateConnections(chain);
            });

            // If there are sources
            if (chain.Sources.length) {

                if (this._Debug) console.warn('Connect: ', chain.Sources, ' to: ', chain.PostEffects);

                // connect all effects in series and then to master
                //App.Audio.Tone.connectSeries(...effects).toMaster();

                if (chain.PostEffects.length) {
                    let currentUnit = chain.PostEffects[0].Effect;
                    for (let i = 1; i <  chain.PostEffects.length; i++) {
                        const toUnit =  chain.PostEffects[i].Effect;
                        currentUnit.connect(toUnit);
                        currentUnit = toUnit;
                    }

                    // Connect all sources to the first effect
                    chain.Sources.forEach((source: ISource) => {
                        source.AudioInput.connect(chain.PostEffects[0].Effect);
                    });

                    // Connect last effect to master
                    chain.PostEffects[chain.PostEffects.length - 1].Effect.toMaster();

                } else {
                    // No effects so connect all sources to Master
                    chain.Sources.forEach((source: ISource) => {
                        // connect to the first Effect in the effects list
                        source.AudioInput.toMaster();
                    });
                }
            }
        });

        // Lastly unmute everything
        this.unMuteTimeout = setTimeout(() => {
            App.Audio.Master.mute = false;
        }, this._MuteBufferTime);

    }
}

export = AccumulativeConnectionMethod;