import Source = require("../Source");
import IAudioChain = require("../../Core/Audio/Connections/IAudioChain");

class PowerSource extends Source {

    Init(sketch?: any): void {

        this.PowerConnections = 0;
        super.Init(sketch);
    }

    UpdateConnections(chain: IAudioChain) {
        this.Chain = chain;
    }

}

export = PowerSource;