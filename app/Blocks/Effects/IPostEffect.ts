import {IEffect} from './../IEffect';

export interface IPostEffect extends IEffect {
    connect;
    disconnect;
}