import IUndoableOperation = require("./IUndoableOperation");

class RemoveItemFromArrayOperation<T> implements IUndoableOperation
{
    private _Item: T;
    private _Array: Array<T>;
    private _Index: number;

    constructor(item:T, array:Array<T>) {
        this._Item = item;
        this._Array = array;
    }

    Do(): Promise<Array<T>> {
        this._Index = this._Array.indexOf(this._Item);

        var that = this;

        return new Promise((resolve) => {
            that._Array.remove(that._Item);
            resolve(that._Array);
        });
    }

    Undo(): Promise<Array<T>> {
        var that = this;

        return new Promise((resolve) => {
            that._Array.insert(that._Item, that._Index);

            resolve(that._Array);
        });
    }

    Dispose(): void {
        this._Item = null;
        this._Array = null;
    }
}

export = RemoveItemFromArrayOperation;