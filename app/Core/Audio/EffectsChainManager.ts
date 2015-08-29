import IBlock = require("../../Blocks/IBlock");
import IEffect = require("../../Blocks/IEffect");
import ISource = require("../../Blocks/ISource");
import Source = require("../../Blocks/Source")
import PostEffect = require("../../Blocks/Effects/PostEffect");
import ConnectionMethodType = require("./ConnectionMethods/ConnectionMethodType");
import ConnectionMethodManager = require("./ConnectionMethods/ConnectionMethodManager");
import SimpleConnectionMethod = require("./ConnectionMethods/SimpleConnectionMethod");
import AccumulativeConnectionMethod = require("./ConnectionMethods/AccumulativeConnectionMethod");
import OriginalConnectionMethod = require("./ConnectionMethods/OriginalConnectionMethod");

class EffectsChainManager {


    public ConnectionMethodType: ConnectionMethodType;
    public ConnectionMethodManager: ConnectionMethodManager;
    protected _Debug: boolean = true;

    constructor() {
        // Set the connection method
        this.ConnectionMethodType = ConnectionMethodType.Accumulative;

        switch (this.ConnectionMethodType) {
            case ConnectionMethodType.Simple:
                this.ConnectionMethodManager = new SimpleConnectionMethod();
                break;
            case ConnectionMethodType.Accumulative:
                this.ConnectionMethodManager = new AccumulativeConnectionMethod();
                break;
            case ConnectionMethodType.Original:
                this.ConnectionMethodManager = new OriginalConnectionMethod();
                break;
            default:
                console.error('No connection method set');
        }
    }

    /**
     * Updates the audio effects chain for all blocks
     * @public
     */
    public Update() {
        if (this._Debug) console.clear();
        this.ConnectionMethodManager.Update();
    }


}

export = EffectsChainManager;