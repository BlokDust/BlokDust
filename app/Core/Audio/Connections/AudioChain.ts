import {IAudioChain} from './IAudioChain';
import {IBlock} from '../../../Blocks/IBlock';
import {IPostEffect} from '../../../Blocks/Effects/IPostEffect';
import {IPowerSource} from "../../../Blocks/Power/IPowerSource";
import {IPreEffect} from '../../../Blocks/Effects/IPreEffect';
import {ISource} from '../../../Blocks/ISource';

export class AudioChain implements IAudioChain {

    public Connections: IBlock[] = [];
    public Sources: ISource[] = [];
    public PostEffects: IPostEffect[] = [];
    public PowerSources: IPowerSource[] = [];
    public PreEffects: IPreEffect[] = [];
    //public PowerEffects: IPowerEffect[] = [];

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

