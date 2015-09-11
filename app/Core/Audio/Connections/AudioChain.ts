import IBlock = require("../../../Blocks/IBlock");
import ISource = require("../../../Blocks/ISource");
import IEffect = require("../../../Blocks/IEffect");
import PreEffect = require("../../../Blocks/Effects/PreEffect");

class AudioChain {
    public Connections: IBlock[] = [];
    public Sources: ISource[] = [];
    public PostEffects: IEffect[] = [];
    public PreEffects: PreEffect[] = [];
    public Others: IBlock[] = [];

    constructor() {

    }
}


export = AudioChain;

