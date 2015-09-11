import ConnectionManager = require("../ConnectionManager");
import IBlock = require("../../../../Blocks/IBlock");
import IEffect = require("../../../../Blocks/IEffect");
import IPreEffect = require("../../../../Blocks/Effects/IPreEffect");
import ISource = require("../../../../Blocks/ISource");
import Source = require("../../../../Blocks/Source");
import Effect = require("../../../../Blocks/Effect");
import PostEffect = require("../../../../Blocks/Effects/PostEffect");
import PreEffect = require("../../../../Blocks/Effects/PreEffect");
import AudioChain = require("../AudioChain");

class AccumulativeConnectionMethod extends ConnectionManager {

    constructor(){
        super();
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

        this.SortChainedBlocks();

        return this.Chains;
    }


}

export = AccumulativeConnectionMethod;