import ConnectionMethodManager = require("./ConnectionMethodManager");
import IBlock = require("../../../Blocks/IBlock");
import IEffect = require("../../../Blocks/IEffect");
import ISource = require("../../../Blocks/ISource");
import Source = require("../../../Blocks/Source");
import PostEffect = require("../../../Blocks/Effects/PostEffect");
import AudioChain = require("./AudioChain");


class AccumulativeConnectionMethod extends ConnectionMethodManager {

    private _MuteBufferTime: number = 50;

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
        setTimeout(()=> {
            // Disconnect everything first!
            App.Sources.forEach((source:ISource) => {

                const effects:IEffect[] = this.GetPostEffectsFromSource(source);

                // This sources input gain
                const sourceInput:Tone.Signal = source.AudioInput;

                // disconnect the input
                sourceInput.disconnect();

                // if this source has any post effects, disconnect those too
                if (effects.length) {

                    effects.forEach((effect:IEffect) => {
                        if (this._Debug) console.log(effect, ' disconnected.');
                        effect.Effect.disconnect();
                    });

                }

            });

            App.Blocks.forEach((block:IBlock) => {
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
        return this.Chains;
    }

    public Connect(chains: AudioChain[]) {
        if (this._Debug) console.log(chains);

        // loop through chains
        chains.forEach((chain: AudioChain) => {

            // seperate connections into effects and sources
            let effects: IEffect[] = [];
            let sources: ISource[] = [];
            chain.Connections.forEach((block: IBlock) => {
                if (block instanceof Source) {
                    sources.push(<ISource>block);
                } else if (block instanceof PostEffect){
                    effects.push(<IEffect>block);
                }
            });

            // If there are sources
            if (sources.length) {

                if (this._Debug) console.warn('Connect: ', sources, ' to: ', effects);

                // connect all effects in series and then to master
                //App.Audio.Tone.connectSeries(...effects).toMaster();

                if (effects.length) {
                    let currentUnit = effects[0].Effect;
                    for (let i = 1; i < effects.length; i++) {
                        const toUnit = effects[i].Effect;
                        currentUnit.connect(toUnit);
                        currentUnit = toUnit;
                    }

                    // Connect all sources to the first effect
                    sources.forEach((s: ISource) => {
                        s.AudioInput.connect(effects[0].Effect);
                        //s.AudioInput.rampTo(1, 1);
                    });

                    // Connect last effect to master
                    effects[effects.length - 1].Effect.toMaster();

                } else {
                    // No effects so connect all sources to Master
                    sources.forEach((source: ISource) => {
                        // connect to the first Effect in the effects list
                        source.AudioInput.toMaster();
                    });
                }
            }
        });

        // Lastly unmute everything
        setTimeout(() => {
            App.Audio.Master.mute = false;
        }, this._MuteBufferTime);

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

export = AccumulativeConnectionMethod;