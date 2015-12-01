import {IBlock} from "../../../Blocks/IBlock";
import {IPostEffect} from "../../../Blocks/Effects/IPostEffect";
import {IPowerSource} from "../../../Blocks/Power/IPowerSource";
import {IPreEffect} from "../../../Blocks/Effects/IPreEffect";
import {ISource} from "../../../Blocks/ISource";
import {IPowerEffect} from "../../../Blocks/Power/IPowerEffect";

export interface IAudioChain {
    Connections: IBlock[];
    Sources: ISource[];
    PostEffects: IPostEffect[];
    PowerSources: IPowerSource[];
    PowerEffects: IPowerEffect[]
    PreEffects: IPreEffect[];
}
