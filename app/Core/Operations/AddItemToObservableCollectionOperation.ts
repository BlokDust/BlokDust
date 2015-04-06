import IUndoableOperation = require("./IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class AddItemToObservableCollectionOperation<T> implements IUndoableOperation
{
    private _Item: T;
    private _Collection: ObservableCollection<T>;
    private _Index: number;

    constructor(item:T, collection:ObservableCollection<T>, index?:number) {
        this._Item = item;
        this._Collection = collection;
        this._Index = index || -1;
    }

    Do(): Promise<ObservableCollection<T>> {
        var that = this;

        return new Promise((resolve, reject) => {

            if (that._Index == -1 || that._Index >= that._Collection.Count){
                that._Collection.Add(that._Item);
            } else {
                that._Collection.Insert(that._Index, that._Item);
            }

//            if (/* everything turned out fine */) {
                resolve(that._Collection);
//            }
//            else {
//                reject(Error("It broke"));
//            }
        });
    }

    Undo(): Promise<ObservableCollection<T>> {
        var that = this;

        return new Promise((resolve) => {
            that._Collection.Remove(that._Item);
            resolve(that._Collection);
        });
    }

    Dispose(): void {
        this._Item = null;
        this._Collection = null;
    }
}

export = AddItemToObservableCollectionOperation;