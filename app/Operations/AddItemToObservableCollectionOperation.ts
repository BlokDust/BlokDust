/// <reference path="../refs" />

import IUndoableOperation = require("./IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class AddItemToObservableCollectionOperation<T> implements IUndoableOperation
{
    Item:T;
    Collection:ObservableCollection<T>;
    Index:number;

    constructor(item:T, collection:ObservableCollection<T>, index?:number) {
        this.Item = item;
        this.Collection = collection;
        this.Index = index || -1;
    }

    Do(): Promise<ObservableCollection<T>> {
        var that = this;

        return new Promise((resolve, reject) => {

            if (that.Index == -1 || that.Index >= that.Collection.Count){
                that.Collection.Add(that.Item);
            } else {
                that.Collection.Insert(that.Item, that.Index);
            }

//            if (/* everything turned out fine */) {
                resolve(that.Collection);
//            }
//            else {
//                reject(Error("It broke"));
//            }
        });
    }

    Undo(): Promise<ObservableCollection<T>> {
        var that = this;

        return new Promise((resolve) => {
            that.Collection.Remove(that.Item);
            resolve(that.Collection);
        });
    }
}

export = AddItemToObservableCollectionOperation;