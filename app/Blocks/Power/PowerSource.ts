import Source = require("../Source");
import AudioChain = require("../../Core/Audio/Connections/AudioChain");
import ISketchContext = Fayde.Drawing.ISketchContext;

class PowerSource extends Source {

    Init(sketch: ISketchContext): void {

        this.PowerConnections = 0;
        super.Init(sketch);
    }

    UpdateConnections(chain: AudioChain) {
        this.Chain = chain;
    }

}

export = PowerSource;