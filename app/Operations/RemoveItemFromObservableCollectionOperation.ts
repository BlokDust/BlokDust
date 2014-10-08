/// <reference path="../refs" />

import IUndoableOperation = require("./IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class RemoveItemFromObservableCollectionOperation<T> implements IUndoableOperation
{
    Item:T;
    Collection:ObservableCollection<T>;
    Index:number;

    constructor(item:T, collection:ObservableCollection<T>) {
        this.Item = item;
        this.Collection = collection;
    }

    Do(): Promise<ObservableCollection<T>> {
        this.Index = this.Collection.IndexOf(this.Item);

        var that = this;

        return new Promise((resolve) => {
            that.Collection.Remove(that.Item);
            resolve(that.Collection);
        });
    }

    Undo(): Promise<ObservableCollection<T>> {
        var that = this;

        return new Promise((resolve) => {
            that.Collection.Insert(that.Item, that.Index);

            resolve(that.Collection);
        });
    }
}

export = RemoveItemFromObservableCollectionOperation;