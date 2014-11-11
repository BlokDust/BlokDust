import IUndoableOperation = require("./IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class ChangePropertyOperation<T> implements IUndoableOperation
{
    private _Object: T;
    private _PropertyName: string;
    private _OldValue: any;
    private _NewValue: any;

    constructor(obj: T, propertyName: string, oldValue: any, newValue: any) {
        this._Object = obj;
        this._PropertyName = propertyName;
        this._NewValue = newValue;

        if (oldValue){
            this._OldValue = oldValue;
        } else {
            this._OldValue = this._Object[this._PropertyName];
        }
    }

    Do(): Promise<T> {
        var that = this;

        return new Promise((resolve) => {

            that._Object[that._PropertyName] = that._NewValue;

            resolve(that._Object);
        });
    }

    Undo(): Promise<T> {
        var that = this;

        return new Promise((resolve) => {

            that._Object[that._PropertyName] = that._OldValue;

            resolve(that._Object);
        });
    }
}

export = ChangePropertyOperation;