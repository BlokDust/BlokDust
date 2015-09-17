import {IBlock} from "../../../Blocks/IBlock";
import {IPostEffect} from "../../../Blocks/Effects/IPostEffect";
import {IPreEffect} from "../../../Blocks/Effects/IPreEffect";
import {ISource} from "../../../Blocks/ISource";

export interface IAudioChain {
    Connections: IBlock[];
    Sources: ISource[];
    PostEffects: IPostEffect[];
    PreEffects: IPreEffect[];
    Others: IBlock[];
}
