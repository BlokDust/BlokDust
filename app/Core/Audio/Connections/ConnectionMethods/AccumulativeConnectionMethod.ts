import ConnectionManager = require("../ConnectionManager");
import IBlock = require("../../../../Blocks/IBlock");
import AudioChain = require("../AudioChain");

class AccumulativeConnectionMethod extends ConnectionManager {

    constructor(){
        super();
    }

    /**
     * Accumulative connection style. All clumps of connections are connected together.
     * All sources in the clump are connected to beginning of the chain and effects
     * connected after in series.
     * @returns {AudioChain[]}
     */
    public CreateChains(): AudioChain[] {
        // for each block
        App.Blocks.forEach((block:IBlock) => {
            // if block isn't chained
            if (!block.IsChained) {
                //create audioChain, add to audioChains[]
                let chain:AudioChain = new AudioChain();
                this.Chains.push(chain);
                this._ParseConnections(chain, block)
            }
        });

        return this.Chains;
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
                this._ParseConnections(chain, childBlock);
            });

        }

    }
}

export = AccumulativeConnectionMethod;