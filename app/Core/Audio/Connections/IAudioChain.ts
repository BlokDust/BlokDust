import IBlock = require("../../../Blocks/IBlock");
import IPreEffect = require("../../../Blocks/Effects/IPreEffect");
import IPostEffect = require("../../../Blocks/Effects/IPostEffect");
import ISource = require("../../../Blocks/ISource");

interface IAudioChain {
    Connections: IBlock[];
    Sources: ISource[];
    PostEffects: IPostEffect[];
    PreEffects: IPreEffect[];
    Others: IBlock[];
}

export = IAudioChain;