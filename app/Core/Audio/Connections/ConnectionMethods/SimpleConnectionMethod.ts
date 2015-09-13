import ConnectionManager = require("../ConnectionManager");
import IEffect = require("../../../../Blocks/IEffect");
import ISource = require("../../../../Blocks/ISource");
import IBlock = require("../../../../Blocks/IBlock");
import PostEffect = require("../../../../Blocks/Effects/PostEffect");
import PreEffect = require("../../../../Blocks/Effects/PreEffect");
import AudioChain = require("../AudioChain");

import IApp = require("../../../../IApp");

declare var App: IApp;

class SimpleConnectionMethod extends ConnectionManager {

    constructor(){
        super();
    }

    public CreateChains(): AudioChain[] {
        // for each source
        App.Sources.forEach((source:ISource) => {
            //create audioChain, add to audioChains[]
            const chain:AudioChain = new AudioChain();
            this.Chains.push(chain);

            const effects: IEffect[] = source.Connections.ToArray();
            chain.Connections.push(source, ...effects);
            chain.Connections.forEach((block: IBlock) => {
                block.IsChained = true;
            })
        });

        this.SortChainedBlocks();

        return this.Chains;
    }
}

export = SimpleConnectionMethod;