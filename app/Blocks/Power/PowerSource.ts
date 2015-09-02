import Source = require("../Source");
import AudioChain = require("../../Core/Audio/ConnectionMethods/AudioChain");

class PowerSource extends Source {

    Init(sketch?: any): void {

        this.PowerConnections = 0;
        super.Init(sketch);
    }

    UpdateConnections(chain: AudioChain) {
        this.Chain = chain;
    }

}

export = PowerSource;