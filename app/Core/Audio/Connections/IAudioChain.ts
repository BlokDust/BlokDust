import {IBlock} from "../../../Blocks/IBlock";
import {IPostEffect} from "../../../Blocks/Effects/IPostEffect";
//import {IPowerEffect} from "../../../Blocks/Power/IPowerEffect";
import {IPreEffect} from "../../../Blocks/Effects/IPreEffect";
import {ISource} from "../../../Blocks/ISource";

export interface IAudioChain {
    Connections: IBlock[];
    Sources: ISource[];
    PostEffects: IPostEffect[];
    PreEffects: IPreEffect[];
    //PowerEffects: IPowerEffect[];
}
