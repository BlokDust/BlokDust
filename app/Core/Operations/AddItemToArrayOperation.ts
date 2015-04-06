import IUndoableOperation = require("./IUndoableOperation");

class AddItemToArrayOperation<T> implements IUndoableOperation
{
    private _Item: T;
    private _Array: Array<T>;
    private _Index: number;

    constructor(item:T, array:Array<T>, index?:number) {
        this._Item = item;
        this._Array = array;
        this._Index = index || -1;
    }

    Do(): Promise<Array<T>> {
        var that = this;

        return new Promise((resolve, reject) => {

            if (that._Index == -1 || that._Index >= that._Array.length){
                that._Array.push(that._Item);
            } else {
                that._Array.insert(that._Item, that._Index);
            }

            resolve(that._Array);
        });
    }

    Undo(): Promise<Array<T>> {
        var that = this;

        return new Promise((resolve) => {
            that._Array.remove(that._Item);
            resolve(that._Array);
        });
    }

    Dispose(): void {
        this._Item = null;
        this._Array = null;
    }
}

export = AddItemToArrayOperation;