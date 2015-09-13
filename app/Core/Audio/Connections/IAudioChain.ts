import IBlock = require("../../../Blocks/IBlock");
import IEffect = require("../../../Blocks/IEffect");
import ISource = require("../../../Blocks/ISource");

interface IAudioChain {
    Connections: IBlock[];
    Sources: ISource[];
    PostEffects: IEffect[];
    PreEffects: IEffect[];
}

export = IAudioChain;