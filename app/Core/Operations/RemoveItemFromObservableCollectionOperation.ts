import IUndoableOperation = require("./IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class RemoveItemFromObservableCollectionOperation<T> implements IUndoableOperation
{
    private _Item:T;
    private _Collection:ObservableCollection<T>;
    private _Index:number;

    constructor(item:T, collection:ObservableCollection<T>) {
        this._Item = item;
        this._Collection = collection;
    }

    Do(): Promise<ObservableCollection<T>> {
        this._Index = this._Collection.IndexOf(this._Item);

        var that = this;

        return new Promise((resolve) => {
            that._Collection.Remove(that._Item);
            resolve(that._Collection);
        });
    }

    Undo(): Promise<ObservableCollection<T>> {
        var that = this;

        return new Promise((resolve) => {
            that._Collection.Insert(that._Item, that._Index);

            resolve(that._Collection);
        });
    }
}

export = RemoveItemFromObservableCollectionOperation;