import IAudioChain = require("./IAudioChain");
import IBlock = require("../../../Blocks/IBlock");
import ISource = require("../../../Blocks/ISource");
import Source = require("../../../Blocks/Source");
import PreEffect = require("../../../Blocks/Effects/PreEffect");
import IPreEffect = require("../../../Blocks/Effects/IPreEffect");
import PostEffect = require("../../../Blocks/Effects/PostEffect");
import IPostEffect = require("../../../Blocks/Effects/IPostEffect");

class AudioChain implements IAudioChain{
    public Connections: IBlock[] = [];
    public Sources: ISource[] = [];
    public PostEffects: IPostEffect[] = [];
    public PreEffects: IPreEffect[] = [];
    public Others: IBlock[] = [];

    constructor() {

    }
    // TODO: make these getters work instead
    //get Sources(): ISource[] {
    //    return <ISource[]>this.Connections.en().where(b => b instanceof Source).toArray();
    //}
    //
    //get PostEffects(): IPostEffect[] {
    //    return <IPostEffect[]>this.Connections.en().where(b => b instanceof PostEffect).toArray();
    //}
    //
    //get PreEffects(): IPreEffect[] {
    //    return <IPreEffect[]>this.Connections.en().where(b => b instanceof PreEffect).toArray();
    //}
}


export = AudioChain;

