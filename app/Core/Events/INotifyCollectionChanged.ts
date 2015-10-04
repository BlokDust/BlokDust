import {CollectionChangedEventArgs} from './CollectionChangedEventArgs';

export interface INotifyCollectionChanged {
    CollectionChanged: nullstone.Event<CollectionChangedEventArgs>;
}

export var INotifyCollectionChanged_ = new nullstone.Interface<INotifyCollectionChanged>("INotifyCollectionChanged");

INotifyCollectionChanged_.is = (o: any): boolean => {
    return o && o.CollectionChanged instanceof nullstone.Event;
};