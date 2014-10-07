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
        return new Promise(function(resolve, reject) {

            if (this.Index == -1 || this.Index >= this.Collection.Count){
                this.Collection.Add(this.Item);
            } else {
                this.Collection.Insert(this.Item, this.Index);
            }

//            if (/* everything turned out fine */) {
                resolve(this.Collection);
//            }
//            else {
//                reject(Error("It broke"));
//            }
        });
    }

    Undo(): Promise<ObservableCollection<T>> {
        return new Promise(function(resolve) {
            this.Collection.Remove(this.Item);
            resolve(this.Collection);
        });
    }
}

export = AddItemToObservableCollectionOperation;