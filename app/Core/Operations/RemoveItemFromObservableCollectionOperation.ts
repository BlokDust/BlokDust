import {IUndoableOperation} from './IUndoableOperation';
import ObservableCollection = Fayde.Collections.ObservableCollection; //TODO: es6 modules

export class RemoveItemFromObservableCollectionOperation<T> implements IUndoableOperation {
    private _Item: T;
    private _Collection: ObservableCollection<T>;
    private _Index: number;

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
            that._Collection.Insert(that._Index, that._Item);

            resolve(that._Collection);
        });
    }

    Dispose(): void {
        this._Item = null;
        this._Collection = null;
    }
}