import {IApp} from '../../../IApp';
import {IAudioChain} from './IAudioChain';
import {IBlock} from '../../../Blocks/IBlock';
import {IEffect} from '../../../Blocks/IEffect';
import {IPostEffect} from '../../../Blocks/Effects/IPostEffect';
import {IPowerEffect} from '../../../Blocks/Power/IPowerEffect';
import {IPowerSource} from '../../../Blocks/Power/IPowerSource';
import {IPreEffect} from '../../../Blocks/Effects/IPreEffect';
import {ISource} from '../../../Blocks/ISource';
import {Source} from '../../../Blocks/Source';
import {PostEffect} from '../../../Blocks/Effects/PostEffect';
import {PowerSource} from '../../../Blocks/Power/PowerSource';
import {PreEffect} from '../../../Blocks/Effects/PreEffect';

declare var App: IApp;

export class ConnectionManager {

    protected _Debug: boolean = false;
    public Chains: IAudioChain[] = [];

    private _MuteBufferTime: number = 35;
    private connectionTimeout;
    private unMuteTimeout;

    public IsConnected: boolean = true;

    constructor(){

    }

    public Update(){
        if (this._Debug) console.clear();

        this.IsConnected = false;

        //First mute everything
        App.Audio.Master.mute = true;

        this._Disconnect(() => {
            const chains = this.CreateChains();
            const powerEffects = App.PowerEffects;
            const powerSources = App.PowerSources;
            this._SortChainedBlocks(chains);
            this._Connect(chains, powerEffects, powerSources);
            this.IsConnected = true;
        });

    }

    /**
     * Disconnects all blocks
     * @param callback to be called when disconnection has finished
     */
    private _Disconnect(callback: Function) {

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

            callback();
        }, this._MuteBufferTime);
    }

    private _Connect(chains: IAudioChain[], powerEffects: IPowerEffect[], powerSources: IPowerSource[]) {
        if (this._Debug) console.log(chains);

        // loop through chains
        chains.forEach((chain: IAudioChain) => {

            // Certain blocks need an individual update method for exclusive functionality.
            // Source resets, PreEffect update values, Powers triggering sources
            // Powers MUST update last in this list because they rely on Sources having sound ready
            chain.Sources.forEach((block: ISource) => {
                block.UpdateConnections(chain);
                block.Chain = chain;
                if (this._Debug) console.log(block);
            });
            chain.PreEffects.forEach((block: IPreEffect) => {
                block.UpdateConnections(chain);
                block.Chain = chain;
                if (this._Debug) console.log(block);
            });
            chain.PowerSources.forEach((block: IPowerSource) => {
                block.Chain = chain;
            });


            // If there are sources
            if (chain.Sources.length) {

                if (this._Debug) console.warn('Connect: ', chain.Sources, ' to: ', chain.PostEffects);

                // connect all effects in series and then to master

                var p = chain.PostEffects;
                if (p.length) {
                    let currentUnit = p[0].Effect;
                    for (let i = 1; i <  p.length; i++) {
                        const toUnit =  p[i].Effect;
                        currentUnit.connect(toUnit);
                        currentUnit = toUnit;
                    }

                    // Connect all sources to the first effect
                    chain.Sources.forEach((source: ISource) => {
                        source.AudioInput.connect(p[0].Effect);
                    });

                    // Connect last effect to master
                    chain.PostEffects[p.length - 1].Effect.toMaster();

                } else {
                    // No effects so connect all sources to Master
                    chain.Sources.forEach((source: ISource) => {
                        // connect to the first Effect in the effects list
                        source.AudioInput.toMaster();
                    });
                }
            }
        });

        powerEffects.forEach((powerEffect: IPowerEffect) => {
            powerEffect.UpdateConnections();
            if (this._Debug) console.log(powerEffect);
        });

        powerSources.forEach((powerSource: IPowerSource) => {
            powerSource.UpdateConnections();
            if (this._Debug) console.log(powerSource);
        });

        // Lastly unmute everything
        this.unMuteTimeout = setTimeout(() => {
            App.Audio.Master.mute = false;
        }, this._MuteBufferTime);

    }

    /**
     * Base CreateChains method.
     * @returns {AudioChain[]}
     */
    public CreateChains(): IAudioChain[] {
        return this.Chains;
    }

    private _SortChainedBlocks(chains: IAudioChain[]){
        // Now sort connections into lists of Sources, PostEffects and PreEffects
        chains.forEach((chain: IAudioChain) => {
            chain.Connections.forEach((block: IBlock) => {
                if (block instanceof PowerSource) {
                    chain.PowerSources.push(<IPowerSource>block);
                } else if (block instanceof Source){
                    chain.Sources.push(<ISource>block);
                } else if (block instanceof PostEffect){
                    chain.PostEffects.push(<IPostEffect>block);
                } else if (block instanceof PreEffect) {
                    chain.PreEffects.push(<IPreEffect>block);
                //} else {
                //    chain.PowerEffects.push(<IPowerEffect>block);
                }
            });
        });
    }

    public GetChainFromBlock(block:IBlock): IAudioChain | boolean {
        let _chain: any;
        this.Chains.forEach((chain: IAudioChain) => {
            // if block is in chain return the chain
            if (chain.Connections.indexOf(block) !== -1) {
                _chain = chain;
            }
        });

        return _chain;
    }

    public GetChainFromPreEffect(block:IPreEffect): IAudioChain | boolean {
        var _chain: any;
        this.Chains.forEach((chain: IAudioChain) => {
            // if block is in chain return the chain
            if (chain.PreEffects.indexOf(block) !== -1) {
                _chain = chain;
            }
        });

        return _chain;
    }
}