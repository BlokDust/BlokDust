import {AudioChain} from '../AudioChain';
import {ConnectionManager} from '../ConnectionManager';
import {IApp} from '../../../../IApp';
import {IAudioChain} from '../IAudioChain';
import {IBlock} from '../../../../Blocks/IBlock';
import {PowerEffect} from '../../../../Blocks/Power/PowerEffect';

declare var App: IApp;

export class AccumulativeConnectionMethod extends ConnectionManager {

    constructor(){
        super();
    }

    /**
     * Accumulative connection style. All clumps of connections are connected together.
     * All sources in the clump are connected to beginning of the chain and effects
     * connected after in series.
     * @returns {AudioChain[]}
     */
    public CreateChains(): IAudioChain[] {
        // for each block
        App.Blocks.forEach((block:IBlock) => {
            // if block isn't chained and ignore PowerEffects as they only connect 1 level deep
            if (!block.IsChained && !(block instanceof PowerEffect)) {
                //create audioChain, add to audioChains[]
                let chain: IAudioChain = new AudioChain();
                this.Chains.push(chain);
                this._ParseConnections(chain, block)
            }
        });

        return this.Chains;
    }

    private _ParseConnections(chain: IAudioChain, parentBlock: IBlock){

        // if parentBlock isn't already in a Chain and ignore PowerEffects as they only connect 1 level deep
        if (chain.Connections.indexOf(parentBlock) === -1 && !(parentBlock instanceof PowerEffect)){
            // add parentBlock to Chain
            chain.Connections.push(parentBlock);
            // set parentBlock.isChained = true
            parentBlock.IsChained = true;
            // forEach connected childbock (source / effect)
            let parentConnections = parentBlock.Connections.ToArray();
            parentConnections.forEach((childBlock) => {
                this._ParseConnections(chain, childBlock);
            });
        }
    }
}