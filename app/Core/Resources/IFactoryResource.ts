import {IResource} from './IResource';

export interface IFactoryResource<T> extends IResource<T> {
    GetInstance(): T;
    GetType(): T;
}