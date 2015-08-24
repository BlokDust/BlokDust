import IBlock = require("../../Blocks/IBlock");
import IEffect = require("../../Blocks/IEffect");
import ISource = require("../../Blocks/ISource");

class AudioChain {
    public Effects: IEffect[] = [];
    public Sources: ISource[] = [];
    public LinkedChains: AudioChain[] = [];

    public Connections: IBlock[] = [];

    constructor() {

    }
}


export = AudioChain;

