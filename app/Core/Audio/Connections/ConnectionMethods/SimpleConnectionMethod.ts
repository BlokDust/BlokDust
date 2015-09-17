import {AudioChain} from '../AudioChain';
import {ConnectionManager} from '../ConnectionManager';
import {IAudioChain} from '../IAudioChain';
import {IBlock} from '../../../../Blocks/IBlock';
import {IEffect} from '../../../../Blocks/IEffect';
import {ISource} from '../../../../Blocks/ISource';

export class SimpleConnectionMethod extends ConnectionManager {

    constructor() {
        super();
    }

    /**
     * Original connection style. Sources chain to each of their immediate effects.
     * @returns {AudioChain[]}
     * @constructor
     */
    public CreateChains(): IAudioChain[] {
        // for each source
        App.Sources.forEach((source:ISource) => {
            //create audioChain, add to audioChains[]
            let chain: IAudioChain = new AudioChain();
            this.Chains.push(chain);

            //Get the source's connections
            const effects: IEffect[] = source.Connections.ToArray();

            // add those connections and the source to this chain.Connections
            chain.Connections.push(source, ...effects);

            // Set all blocks is chained to true
            chain.Connections.forEach((block: IBlock) => {
                block.IsChained = true;
            })
        });

        return this.Chains;
    }
}