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

    Execute():void {
        if (this.Index == -1 || this.Index >= this.Collection.Count){
            this.Collection.Add(this.Item);
        } else {
            this.Collection.Insert(this.Item, this.Index);
        }
    }

    Undo():void {
        this.Collection.Remove(this.Item);
    }

    get Label():string{
        return "Add item";
    }
}

export = AddItemToObservableCollectionOperation;